const id = 'wp-i18n-plugin';
const walk = require('./acorn-walk.js');
const ConstDependency = require('webpack/lib/dependencies/ConstDependency');
const paramsPatten = /__\([\'|\"|`|\`](.+?)[\'|\"|`|\`]\)/;
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');

const mkdir = (dir) => {
  let tempDir = dir;
  if (path.isAbsolute(tempDir) === false) {
    let tempPath = '';
    tempDir.split('/').map((p) => {
      tempPath = tempPath + p + '/';
      tempDir = path.join(process.cwd(), tempPath);
      if (fs.existsSync(tempDir) === false) {
        fs.mkdirSync(tempDir);
      }
    });
  }
  return tempDir;
};

const makeFile = (dir) => {
  const fileName = path.basename(dir);
  const fileDir = path.dirname(dir);
  let absPath = mkdir(fileDir);
  let filePath = absPath + fileName;
  console.log(filePath);
  if (fs.existsSync(filePath) === false) {
    fs.writeFileSync(filePath, '{}');
  }
};

class WpI18nPlugin {
  constructor (opts) {
    this.options = Object.assign({
      languageList: [], // 自动新增i18n对象语言列表
      useLanguage: '', // 设置默认将对于key设置为cn的值
      autoWriteAble: true, // 是否启用自动写入文件
      formatSpace: 2, // 格式化空格个数
      sourcePath: '', // 多语言json文件路径
      showDetail: false, // 是否展示未翻译的项
      removeUnUseKeys: false, // 是否移除不使用key
      patten: paramsPatten // 自定义匹配正则
    }, opts || {});
    makeFile(this.options.sourcePath);
    this.i18nData = {};
    this.useKeyList = new Set();
  }
  getValue (key) {
    const {
      languageList,
      useLanguage
    } = this.options;
    const obj = this.i18nData;
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
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(
      id,
      (compilation, { normalModuleFactory }) => {
        if (!compilation.name) {
          throw new Error(chalk.red('[wp-i18n-plugin] webpack config `name` should not be empty.\n\n'));
        }
        const replaceLiteral = (str) => {
          if (this.options.patten.test(str) === true) {
            let result = null;
            let inpValue = str;
            while ((result = this.options.patten.exec(inpValue))) {
              let [str, key] = result;
              this.getValue(key);
              inpValue = inpValue.replace(str, this.i18nData[key][compilation.name] || '');
              this.useKeyList.add(key);
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
            if (val) {
              val = JSON.stringify(val);
            }
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
        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap(id, handler);
        normalModuleFactory.hooks.parser
          .for('javascript/dynamic')
          .tap(id, handler);
        normalModuleFactory.hooks.parser.for('javascript/esm').tap(id, handler);
      }
    );
    compiler.hooks.watchRun.tapAsync(id, (compilation, callback) => {
      try {
        let i18nData = fs.readFileSync(this.options.sourcePath, { encoding: 'UTF-8' });
        const keys = Object.keys(this.i18nData);
        this.i18nData = i18nData ? JSON.parse(i18nData) : {};
        // 根据当前语言列表创建对象
        const template = this.options.languageList.reduce((obj, lang) => {
          obj[lang] = '';
          return obj;
        }, {});
        keys.map(item => {
          this.i18nData[item] = Object.assign({}, template, this.i18nData[item]);
        });
        this.useKeyList = new Set();
        callback();
      } catch (err) {
        callback(err);
      }
    });
    compiler.hooks.done.tapAsync(id, (name, callback) => {
      const {
        formatSpace,
        sourcePath,
        languageList,
        showDetail,
        removeUnUseKeys
      } = this.options;
      // 生产模式不进行文件操作
      if (compiler.options.mode === 'production') {
        return callback();
      }
      let newObj = {}, emptyObj = {}, counterObj = {};
      if (removeUnUseKeys === true) {
        this.options.removeUnUseKeys = false;
        Object.keys(this.i18nData).map(key => {
          if (this.useKeyList.has(key) === false) {
            delete this.i18nData[key];
          }
        });
        this.useKeyList.clear();
      }
      // 升序排序
      Object.keys(this.i18nData).sort().map(key => {
        // 剔除未填写多语言翻译的项
        let isTransfer = languageList.some(lang => {
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
      emptyArr.map(key => {
        newObj[key] = emptyObj[key];
      });
      this.i18nData = newObj;
      fs.writeFile(sourcePath, JSON.stringify(this.i18nData, null, formatSpace), (err) => {
        if (err) return err;
        this.i18nData = {};
        // There are ${ chalk.underline.red(emptyArr.length) } untranslated finishes.
        console.log(chalk.rgb(152, 195, 121)(`Json file path: ${chalk.underline.yellow(sourcePath)}\n`));
        Object.keys(counterObj).map(item => {
          let count = counterObj[item].size;
          if (count > 0) {
            console.log(chalk.rgb(97, 175, 239)(`'${item}' untranslated amount: ${ counterObj[item].size }`));
          }
          if (showDetail === true) {
            console.log(chalk.blue(`\n'${item}' untranslated keys: \n${ [...counterObj[item]].join(' | ') }`));
          }
        });
        callback();
      });
    });
  }
}

module.exports = WpI18nPlugin;
