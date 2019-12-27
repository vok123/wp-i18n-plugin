const WebpackI18n = require('../index.js'),
  path = require('path'),
  _ = require('lodash');

let webpackConfig = {
  name: '',
  mode: 'development' || 'production',
  entry: './example/example.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: './output.js'
  },
  plugins: [
    // 多语言处理插件
    new WebpackI18n.Plugin({
      sourcePath: './example/lang.json',
      // 自动新增i18n对象语言列表
      languageList: ['cn', 'en'],
      // 设置默认将对于key设置为cn的值
      useLanguage: 'cn',
      // 是否根据内容自动生成对象
      autoWriteAble: true,
      // 格式化对象空格数
      formatSpace: 2,
      // 是否展示未翻译的项
      showDetail: false,
      // 自动移除无用的key
      removeUnUseKeys: true
    }),
    new WebpackI18n.Spliter({
      // 输出文件路径名称
      outputName: 'lang/async-lang.json',
      // 语言包路径
      sourcePath: './example/async-lang.json'
    })
  ]
};

// node api
webpackConfigArr = ['cn', 'en'].map(language => {
  webpackConfig = _.cloneDeep(webpackConfig);
  // 配置当前编译参数
  webpackConfig.name = language;
  // 配置输出路径
  webpackConfig.output.path = path.join(__dirname, 'dist') + '/' + language;
  return webpackConfig;
});
const webpack = require('webpack');
webpack(webpackConfigArr, (err, stats) => {
  err && console.log(err);
});

// npm run test 

// module.exports = ['cn', 'en'].map(language => {
//   webpackConfig = require('lodash').cloneDeep(webpackConfig);
//   // 配置当前编译参数
//   webpackConfig.name = language;
//   // 配置输出路径
//   webpackConfig.output.path = require('path').join(__dirname, 'dist') + '/' + language;
//   return webpackConfig;
// });

// npx webpack --config ./example/webpack.config.js