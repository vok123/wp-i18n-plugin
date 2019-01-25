// const { parse } = require('@vue/component-compiler-utils');
const vueCompiler = require('./vue-parser.js'),
  contentParser = require('./content-parser.js'),
  loaderUtils = require('loader-utils'),
  fs = require('fs');
const paramsPattrn = /__\([\'|\"|`|\`](.+?)[\'|\"|`|\`]\)/;
let options = {}, dependencyList = [];
module.exports = function(source, map, mate) {
  this.cacheable();
  if (!global._i18nData) {
    global._i18nData = {};
  }
  options = loaderUtils.getOptions(this);
  const descriptor = vueCompiler.parse(this, source);
  let [i18nBlock] = descriptor.customBlocks.filter(
    item => item.type === options.tagName
  );
  if (!i18nBlock) return source;
  const callback = this.async();
  let { content, attrs } = i18nBlock,
    contentData = contentParser(this, content);
  if (attrs.src) {
    this.resolve('_i18n-loader', loaderUtils.urlToRequest(attrs.src), (err, jsonPath) => {
      if (dependencyList.indexOf(jsonPath) === -1) {
        this.addDependency(jsonPath);
        dependencyList.push(jsonPath);
      }
      if (err) {
        this.emitError(new Error(err));
        return callback(err);
      }
      let json = fs.readFileSync(jsonPath, { encoding: 'UTF-8' });
      callback(null, writeFile.call(this, source, json, jsonPath));
    });
  } else {
    callback(null, writeFile.call(this, source, contentData));
  }
};

function writeFile(source, data, jsonPath) {
  const {
    tagName,
    languageList,
    useLanguage,
    autoWriteAble = true,
    formatSpace = 2
  } = options;
  let writeAble = false,
    fileSource = source.slice(0);
  let i18nStartTag = `<${tagName}`,
    i18nEndTag = `</${tagName}>`;
  if (source.indexOf(i18nStartTag) > -1) {
    data = toString.call(data) === '[object String]' ? JSON.parse(data) : data;
    Object.assign(global._i18nData, data);
    let key = '';
    while (paramsPattrn.test(fileSource) === true) {
      key = RegExp.$1;
      fileSource = fileSource.slice(fileSource.indexOf(RegExp.lastMatch) + RegExp.lastMatch.length - 1);
      if (key in data === false) {
        writeAble = true;
        data[key] = languageList.reduce((initObj, type) => {
          initObj[type] = useLanguage === type ? key : '';
          return initObj;
        }, {});
      }
    }
    if (writeAble === true && autoWriteAble === true) {
      if (jsonPath) {
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, formatSpace));
      } else {
        let startContent = source.slice(
            0,
            source.indexOf(i18nStartTag)
          ),
          endContent = source.slice(
            source.indexOf(i18nEndTag) + i18nEndTag.length
          );
        let newFile =
          startContent +
          (source.indexOf(i18nStartTag) ? '\n' : '') +
          '<' +
          tagName +
          '>\n' +
          JSON.stringify(data, null, 2) +
          '\n</' +
          tagName +
          '>' +
          endContent;
        fs.writeFileSync(this.resourcePath, newFile);
      }
    }
    return (
      source.slice(0, source.indexOf(i18nStartTag)) +
      source.slice(source.indexOf(i18nEndTag) + i18nEndTag.length)
    );
  }
  return source;
}
