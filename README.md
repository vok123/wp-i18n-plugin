# 用于webpack 4进行多编译进行多语言打包处理. 包含编译多语言处理及异步多语言拆分输出
  - 项目打包后根据配置的多语言数量生成多分具有单一语言的文件, 例如使用cn,en则最后输出将会有 /dist/cn , /dist/en

### 安装
``` bash
npm install wp-i18n-loader --save-dev
```

``` js
const WebpackI18n = require('wp-i18n-loader');

const webpackConfig = {
  name: '',
  // mode: 'development || 'production',
  entry: './example',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'js/[name].output.js'
  },
  plugins: [
    // 多语言处理插件
    new WebpackI18n.Plugin({
      sourcePath: 'src/lang/lang.json',
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
      sourcePath: 'src/lang/async-lang.json'
    })
  ]
};
```


### webpack多编译设置
``` js
// node api
webpackConfigArr = ['cn', 'en'].map(language => {
  webpackConfig = require('lodash').cloneDeep(webpackConfig);
  // 配置当前编译参数
  webpackConfig.name = language;
  // 配置输出路径
  webpackConfig.output.path = '/' + language;
  return webpackConfig;
});
webpack(webpackConfigArr);

// webpack config
module.exports = ['cn', 'en'].map((language) => {
  webpackConfig = require('lodash').cloneDeep(webpackConfig);
	// 配置当前编译参数
  webpackConfig.name = language;
  // 配置输出路径
  webpackConfig.output.path = '/' + language;
  return webpackConfig;
});

```

### 关于多编译 webpack-dev-server 配置
  - 建议只对单一的入口进行配置
### 关于编译性能提升
  - 建议开发时只启动单个语言进行开发, 以降低编译次数以达到快速编译的效果

