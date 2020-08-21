const fs = require('fs');
const chalk = require('chalk');
const { simple } = require('acorn-walk');
const ConstDependency = require('webpack/lib/dependencies/ConstDependency');
const { fixString, makeFile, getPatten } = require('./utils');

const id = 'wp-i18n-plugin';

class WpI18nPlugin {
  constructor(opts) {
    this.options = Object.assign(
      {
        languageList: [], // 自动新增i18n对象语言列表
        useLanguage: '', // 设置默认将对于key设置为cn的值
        autoWriteAble: true, // 是否启用自动写入文件
        formatSpace: 2, // 格式化空格个数
        sourcePath: '', // 多语言json文件路径
        removeUnUseKeys: false, // 是否移除不使用key
        patten: getPatten(['__']) // 自定义匹配正则
      },
      opts || {}
    );
    makeFile(this.options.sourcePath);
    this.i18nData = {};
    this.useKeyList = new Set();
  }
  /**
   * 收集多语言的key
   * @param { string } key string
   */
  collectKeys(key) {
    const { languageList, useLanguage } = this.options;
    const { i18nData } = this;
    if (key in i18nData === false) {
      i18nData[key] = languageList.reduce((initObj, type) => {
        initObj[type] = useLanguage === type ? key : '';
        return initObj;
      }, {});
      return;
    }
    if (useLanguage && !i18nData[key][useLanguage]) {
      i18nData[key][useLanguage] = key;
    }
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(id, (compilation, { normalModuleFactory }) => {
      if (!compilation.name) {
        throw new Error(chalk.red('[wp-i18n-plugin] webpack config `name` should not be empty.\n\n'));
      }
      const replaceLiteral = (str) => {
        let result = null;
        let originStr = str;
        const { patten } = this.options;
        while ((result = patten.exec(originStr))) {
          patten.lastIndex = 0;
          let [inputStr, key] = result;
          key = fixString(key);
          this.collectKeys(key);
          const langObj = this.i18nData[key];
          const lan = compilation.name;
          originStr = originStr.replace(inputStr, langObj[lan] || key || '');
          this.useKeyList.add(key);
        }
        return originStr;
      };
      
      const handler = (parser) => {
        const render = (val, node) => {
          if (!val) return;
          const dep = new ConstDependency(val, node.range);
          dep.weak = true;
          dep.loc = node.loc;
          parser.state.current.addDependency(dep);
        };
        const programHandle = ast => {
          simple(ast, {
            // template string
            TemplateLiteral: (node) => {
              if (node.quasis && node.quasis.length) {
                node.quasis.map((node) => {
                  const result = replaceLiteral(node.value.raw);
                  render(result, node);
                });
              }
            },
            // string
            Literal: (node) => {
              let result = replaceLiteral(node.value);
              if (result) {
                result = JSON.stringify(result);
              }
              render(result, node);
            }
          });
        };
        parser.hooks.program.tap(id, programHandle);
      };
      ['javascript/auto', 'javascript/dynamic', 'javascript/esm'].map(type => {
        normalModuleFactory.hooks.parser.for(type).tap(id, handler);
      });
    });
    const initJson = (callback) => {
      try {
        const i18nStr = fs.readFileSync(this.options.sourcePath, { encoding: 'UTF-8' });
        this.i18nData = i18nStr ? JSON.parse(i18nStr) : {};
        this.useKeyList = new Set();
        callback();
      } catch (err) {
        callback(err);
      }
    };
    compiler.hooks.beforeRun.tapAsync(id, (compilation, callback) => {
      initJson(callback);
    });
    compiler.hooks.watchRun.tapAsync(id, (compilation, callback) => {
      initJson(callback);
    });
    compiler.hooks.done.tapAsync(id, (name, callback) => {
      const { formatSpace, sourcePath, languageList, removeUnUseKeys } = this.options;
      if (compiler.options.mode === 'production') {
        return callback();
      }
      if (removeUnUseKeys === true) {
        this.options.removeUnUseKeys = false;
        Object.keys(this.i18nData).map((key) => {
          if (this.useKeyList.has(key) === false) {
            delete this.i18nData[key];
          }
        });
        this.useKeyList.clear();
      }

      let newJson = {};
      let noTransfer = [];

      const untranslated = {};
      languageList.map(lang => {
        untranslated[lang] = {
          count: 0,
          list: []
        };
      });
      Object.keys(this.i18nData)
        .sort()
        .map((key) => {
          const isTransfer = languageList.every((lang) => {
            // 未完成翻译
            if (!this.i18nData[key][lang]) {
              untranslated[lang].count++;
              untranslated[lang].list.push(key);
              return false;
            }
            return true;
          });
          // 全部翻译过的
          if (isTransfer) {
            newJson[key] = this.i18nData[key];
          } else { // 部分未完成翻译的
            noTransfer.push(key);
          }
        });
      // 将未填写多语言翻译的排序后放置最后
      noTransfer.map((key) => {
        newJson[key] = this.i18nData[key];
      });
      this.i18nData = newJson;

      if (this.autoWriteAble === false) {
        return callback();
      }

      if (Object.keys(this.i18nData).length === 0) {
        return callback();
      }

      fs.writeFile(sourcePath, JSON.stringify(this.i18nData, null, formatSpace), (err) => {
        if (err) return err;
        console.log(chalk.rgb(152, 195, 121)(`Json file path: ${chalk.underline.yellow(sourcePath)}\n`));
        Object.keys(untranslated).map((lang) => {
          const { count } = untranslated[lang];
          if (count > 0) {
            console.log(chalk.rgb(97, 175, 239)(`'${lang}' untranslated amount: ${count}`));
          }
        });
        callback();
      });
    });
  }
}

module.exports = WpI18nPlugin;
