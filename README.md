## 用于webpack 4进行多编译进行多语言打包处理. 包含编译多语言处理及异步多语言拆分输出
  - 项目打包后根据配置的多语言数量生成多分具有单一语言的文件, 例如使用cn,en则最后输出将会有 /dist/cn , /dist/en


### 安装
``` bash
npm install webpack webpack-cli wp-i18n-loader --save-dev
```
### example.js
``` js
console.log('__("你好")');
```
### src/lang/lang.json
``` json
{
  "你好": {
    "cn": "你好",
    "en": "Hello"
  }
}
```
### webpack.config.js
``` js
const WebpackI18n = require('wp-i18n-loader'),
  path = require('path'),
  _ = require('lodash');

let webpackConfig = {
  name: '',
  mode: 'development' || 'production',
  entry: './example/example.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'js/output.js'
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
      showDetail: true,
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
```

### webpack多编译设置(使用node api 或者 webpack config中的一种)
``` js
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

// webpack config
module.exports = ['cn', 'en'].map((language) => {
  webpackConfig = _.cloneDeep(webpackConfig);
	// 配置当前编译参数
  webpackConfig.name = language;
  // 配置输出路径
  webpackConfig.output.path = path.join(__dirname, 'dist') + '/' + language;
  return webpackConfig;
});

```

### dist/en/output.js
``` js
console.log('Hello');
```
### dist/cn/output.js
``` js
console.log('你好');
```

### 关于多编译 webpack-dev-server 配置
  - 建议只对单一的入口进行配置
### 关于编译性能提升
  - 建议开发时只启动单个语言进行开发, 以降低编译次数以达到快速编译的效果

