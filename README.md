## 🎉🎉 前端多语言编译处理解决方案 wp-i18n-plugin 
  - 基于webpack4 AST分析多语言生成插件, 支持Vue, React, Angular
  - 自动管理语言配置, 在编译期后直接生成多语言拆分, 无需在客户端重新渲染
  - 项目打包后根据配置的多语言数量生成多分具有单一语言的文件. 例如使用zh-cn, en则最后输出将会有
  ``` js
/dist/zh-cn
/dist/en
  ```


### 👏👏安装
``` bash
npm install webpack webpack-cli wp-i18n-plugin --save-dev
```

### ⚙ webpack.config.js
``` js
const WebpackI18n = require('wp-i18n-plugin'),
  path = require('path'),
  _ = require('lodash');

let webpackConfig = {
  name: '',
  mode: 'development' || 'production',
  entry: './example/example.js',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'output.js'
  },
  plugins: [
    // 多语言处理插件
    new WebpackI18n.Plugin({
      sourcePath: './example/lang.json',
      // 自动新增i18n对象语言列表
      languageList: ['zh-cn', 'en'],
      // 设置默认将对于key设置为zh-cn的值
      useLanguage: 'zh-cn',
      // 是否根据内容自动生成对象
      autoWriteAble: true,
      // 格式化对象空格数
      formatSpace: 2,
      // 是否展示未翻译的项
      showDetail: true,
      // 自动移除无用的key
      removeUnUseKeys: true
    }),
    // 后端返回code对应多语言文件拆分
    new WebpackI18n.Spliter({
      // 输出文件路径名称
      outputName: './example/async-lang.json',
      // 语言包路径
      sourcePath: './example/async-lang.json'
    })
  ]
};
```

### 📦[webpack多编译](https://webpack.js.org/concepts/targets/#multiple-targets)设置(使用node api 或者 webpack config中的一种)
- node api 启动配置方式
``` js
webpackConfigArr = ['zh-cn', 'en'].map(language => {
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

```
- webpack config 启动配置方式
``` js
module.exports = ['zh-cn', 'en'].map((language) => {
  webpackConfig = _.cloneDeep(webpackConfig);
	// 配置当前编译参数
  webpackConfig.name = language;
  // 配置输出路径
  webpackConfig.output.path = path.join(__dirname, 'dist') + '/' + language;
  return webpackConfig;
});
```
## 🌰例子
#### example.js
``` js
console.log('__("你好")');
```
#### lang.json
``` json
{
  "你好": {
    "zh-cn": "你好",
    "en": "Hello"
  }
}
```
### 🐭example.js编译后输出结果:
 - dist/en/output.js
``` js
console.log('Hello');
```
 - dist/zh-cn/output.js
``` js
console.log('你好');
```


### 🖖 关于编译性能提升
  - 建议使用在项目中加入cache-loader进行缓存以提高效率
  - 建议开发时只启动单个语言进行开发, 以降低编译次数以达到快速编译的效果

