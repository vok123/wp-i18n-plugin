const fs = require('fs');
const path = require('path');
/**
 * 生成指定函数名称正则获取字符串函数的正则 funcs:['test'] -> 'test("something")...' -> something
 * @param {[string]} funcs
 */
const getPatten = (funcs) => {
  const matchFuncs = funcs.map((func) => {
    if (func === '__') {
      func = '(?![^_])|__';
    }
    return '(?:' + func + ')';
  }).join('|').replace(/\./g, '\\.');
  const matchSpecialCharacters = '[\\r\\n\\s]*';
  const stringGroup =
    matchSpecialCharacters +
    '(' +
    // backtick (``)
    '`(?:[^`\\\\]|\\\\(?:.|$))*`' +
    '|' +
    // double quotes ("")
    '"(?:[^"\\\\]|\\\\(?:.|$))*"' +
    '|' +
    // single quote ('')
    "'(?:[^'\\\\]|\\\\(?:.|$))*'" +
    ')' +
    matchSpecialCharacters;
  const pattern = '(?:(?:^\\s*)|[^a-zA-Z0-9_])' + '(?:' + matchFuncs + ')' + '\\(' + stringGroup + '(?:[\\,]' + stringGroup + ')?' + '[\\,\\)]';
  return new RegExp(pattern, 'gim');
};

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

const fixString = (strToFix) => {
  let fixedString = strToFix.trim();
  const firstChar = fixedString[0];
  if (firstChar === '`' && fixedString.match(/\${.*?}/)) {
      return null;
  }
  if (['\'', '"', '`'].includes(firstChar)) {
      fixedString = fixedString.slice(1, -1);
  }
  fixedString = fixedString.replace(/(\\\n|\\\r\n)/g, '');
  fixedString = fixedString.replace(/(\\b|\\f|\\n|\\r|\\t|\\v|\\0|\\\\|\\"|\\')/g, (match) => eval(`"${match}"`));

  fixedString = fixedString.replace(/(\\x[a-fA-F0-9]{2}|\\u[a-fA-F0-9]{4})/g, (match) => eval(`"${match}"`));
  ['\'', '"', '`'].map(c => {
    const start = new RegExp(`^\\${c}`);
    const end = new RegExp(`\\${c}$`);
    fixedString = fixedString.replace(start, '').replace(end, '');
  });
  return fixedString;
}

module.exports = { fixString, makeFile, getPatten };