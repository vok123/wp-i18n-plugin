module.exports = function(context, content) {
  let i18nContent = content.trim(),
    obj = {};
  var temp = '';
  for (let i = 0; i < i18nContent.length; i++) {
    if ([10].indexOf(i18nContent[i].charCodeAt()) == -1) temp += i18nContent[i];
  }
  try {
    if (temp) {
      obj = eval('(' + temp + ')'); // eslint-disable-line no-eval
    }
  } catch (err) {
    context.emitError(new Error(err));
  }
  return obj || {};
};
