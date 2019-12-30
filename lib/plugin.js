const id = 'wp-i18n-plugin';
let walk = require('./acorn-walk.js'),
  ConstDependency = require('webpack/lib/dependencies/ConstDependency');
let paramsPattrn = /__\([\'|\"|`|\`](.+?)[\'|\"|`|\`]\)/,
  fs = require('fs'),
  chalk = require('chalk');

class WpI18nPligin {
  constructor(opts) {
    this.options = Object.assign(
      {
        languageList: [], // 自动新增i18n对象语言列表
        useLanguage: '', // 设置默认将对于key设置为cn的值
        autoWriteAble: true, // 是否启用自动写入文件
        formatSpace: 2, // 格式化空格个数
        sourcePath: '', // 多语言json文件路径
        showDetail: false, // 是否展示未翻译的项
        removeUnUseKeys: false, // 是否移除不使用key
        pattrn: paramsPattrn // 自定义匹配正则
      },
      opts || {}
    );
    this.i18nData = {};
    this.unUseList = new Set();
  }
  getValue(i18nData, key) {
    const { languageList, useLanguage } = this.options;
    let obj = Object.assign(i18nData, global._i18nData || {}) || {};
    if (key in obj === false) {
      obj[key] = languageList.reduce((initObj, type) => {
        initObj[type] = useLanguage === type ? key : '';
        return initObj;
      }, {});
    } else {
      if (useLanguage && !obj[key][useLanguage]) {
        obj[key][useLanguage] = key;
      }
    }
    return obj;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(id, (compilation, { normalModuleFactory }) => {
      const replaceLiteral = (str) => {
        if (this.options.pattrn.test(str) === true) {
          let result = null,
            inpValue = str;
          while ((result = this.options.pattrn.exec(inpValue))) {
            let [str, key] = result;
            this.i18nData = this.getValue(this.i18nData, key);
            inpValue = inpValue.replace(str, this.i18nData[key][compilation.name] || '');
            this.unUseList.delete(key);
          }
          return inpValue;
        }
        return '';
      };
      const parseLiteral = (node, parser) => {
        let val = '';
        if (node.type === 'TemplateElement') {
          val = replaceLiteral(node.value.raw);
        } else if (node.type === 'Literal') {
          val = replaceLiteral(node.value);
        }
        if (!val) return;
        const dep = new ConstDependency(val, node.range);
        dep.loc = node.loc;
        parser.state.current.addDependency(dep);
      };
      const handler = (parser) => {
        parser.hooks.program.tap(id, (ast) => {
          walk.simple(ast, {
            // template string
            TemplateLiteral: (node) => {
              if (node.quasis && node.quasis.length) {
                node.quasis.map((cNode) => {
                  parseLiteral(cNode, parser);
                });
              }
            },
            // string
            Literal: (node) => {
              parseLiteral(node, parser);
            }
          });
        });
      };
      normalModuleFactory.hooks.parser.for('javascript/auto').tap(id, handler);
      normalModuleFactory.hooks.parser.for('javascript/dynamic').tap(id, handler);
      normalModuleFactory.hooks.parser.for('javascript/esm').tap(id, handler);
    });
    compiler.hooks.beforeCompile.tapAsync(id, (compilation, callback) => {
      try {
        let i18nData = fs.readFileSync(this.options.sourcePath, {
            encoding: 'UTF-8'
          }),
          arr = Object.keys(this.i18nData),
          template = {};
        this.i18nData = i18nData ? JSON.parse(i18nData) : {};
        template = this.options.languageList.reduce((obj, lang) => {
          obj[lang] = '';
          return obj;
        }, {});
        arr.map((item) => {
          this.i18nData[item] = Object.assign({}, template, this.i18nData[item]);
        });
        this.unUseList = new Set(arr);
        callback();
      } catch (err) {
        callback(err);
      }
    });
    compiler.hooks.done.tapAsync(id, (name, callback) => {
      const { formatSpace, sourcePath, languageList, showDetail, removeUnUseKeys } = this.options;
      // 生产模式不进行文件操作
      if (compiler.options.mode === 'production') {
        return callback();
      }
      let newObj = {},
        emptyObj = {},
        counterObj = {};
      if (removeUnUseKeys === true) {
        this.options.removeUnUseKeys = false;
        for (let key of this.unUseList.keys()) {
          delete this.i18nData[key];
        }
        this.unUseList.clear();
      }
      // 升序排序
      Object.keys(this.i18nData)
        .sort()
        .map((key) => {
          // 剔除未填写多语言翻译的项
          let isTransfer = languageList.some((lang) => {
            // 初始化数组
            if (!counterObj[lang]) {
              counterObj[lang] = new Set();
            }
            // 未完成翻译
            if (!this.i18nData[key][lang]) {
              counterObj[lang].add(key);
              return true;
            }
          });
          if (isTransfer) {
            emptyObj[key] = this.i18nData[key];
            return;
          }
          newObj[key] = this.i18nData[key];
        });
      // 将未填写多语言翻译的排序后放置最后
      let emptyArr = Object.keys(emptyObj);
      emptyArr.map((key) => {
        newObj[key] = emptyObj[key];
      });
      this.i18nData = newObj;
      fs.writeFile(sourcePath, JSON.stringify(this.i18nData, null, formatSpace), (err) => {
        if (err) return err;
        this.i18nData = {};
        // There are ${ chalk.underline.red(emptyArr.length) } untranslated finishes.
        console.log(chalk.rgb(152, 195, 121)(`Json file path: ${chalk.underline.yellow(sourcePath)}\n`));
        Object.keys(counterObj).map((item) => {
          let count = counterObj[item].size;
          if (count > 0) {
            console.log(chalk.rgb(97, 175, 239)(`'${item}' untranslated amount: ${counterObj[item].size}`));
          }
          if (showDetail === true) {
            console.log(chalk.blue(`\n'${item}' untranslated keys: \n${[...counterObj[item]].join(' | ')}`));
          }
        });
        callback();
      });
    });
  }
}

module.exports = WpI18nPligin;
