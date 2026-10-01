const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // ECharts pins tslib 2.3, whose import entry breaks under Metro on native and web.
  if (
    moduleName === 'tslib' &&
    /[/\\]node_modules[/\\](echarts|zrender)[/\\]/.test(
      context.originModulePath,
    )
  ) {
    return {
      type: 'sourceFile',
      filePath: path.join(
        path.dirname(require.resolve('tslib')),
        'tslib.es6.js',
      ),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: './src/global.css',
});
