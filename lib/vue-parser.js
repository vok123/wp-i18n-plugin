const { parse } = require('@vue/component-compiler-utils');
const path = require('path');
function loadTemplateCompiler() {
  try {
    return require('vue-template-compiler');
  } catch (e) {
    throw new Error(
      `[vue-loader] vue-template-compiler must be installed as a peer dependency, ` +
        `or a compatible compiler implementation must be passed via options.`
    );
  }
}
exports.parse = function (context, source) {
  const { sourceMap, rootContext, resourcePath } = context;
  const filename = path.basename(resourcePath);
  const sourceRoot = path.dirname(path.relative(rootContext || process.cwd(), resourcePath));
  const descriptor = parse({
    source,
    compiler: loadTemplateCompiler(),
    filename,
    sourceRoot,
    needMap: sourceMap
  });
  return descriptor;
};

exports.loadTemplateCompiler = loadTemplateCompiler;
