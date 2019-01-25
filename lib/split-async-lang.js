const fs = require('fs');
const id = 'split-async-lang';
class SplitAsyncLang {
  constructor ({outputName, sourcePath}) {
    this.outputName = outputName;
    this.sourcePath = sourcePath;
  }
  apply (compiler) {
    // 格式转换为key value形式
    try {
      const langSourceFilter = (source, langType) => {
        let newLang = {};
        Object.keys(source).map(item => {
          newLang[item] = source[item][langType];
        });
        return newLang;
      };
      compiler.hooks.emit.tapAsync(id, (compilation, callback) => {
        let json = fs.readFileSync(this.sourcePath, { encoding: 'UTF-8' });
        json = langSourceFilter(JSON.parse(json), compilation.name);
        let jsonStr = JSON.stringify(json);
        compilation.assets[this.outputName] = {
          source: () => jsonStr,
          size: () => jsonStr.length
        };
        callback();
      });
      compiler.hooks.afterCompile.tapAsync(id, (compilation, callback) => {
        if (compilation.fileDependencies.has(this.sourcePath) === false) {
          compilation.fileDependencies.add(this.sourcePath);
        }
        callback();
      });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = SplitAsyncLang;
