const singleSpaAngularWebpack = require("single-spa-angular/lib/webpack")
  .default;

const webpackMerge = require("webpack-merge");

module.exports = (angularWebpackConfig, options) => {
  // Feel free to modify this webpack config however you'd like to
  const singleSpaWebpackConfig = singleSpaAngularWebpack(
    angularWebpackConfig,
    options
  );

  const singleSpaConfig = {
    externals: {
      "zone.js": "Zone",
      "single-spa": "single-spa",
      rxjs: "rxjs",
      "rxjs/operators": "rxjs/operators",
    },
  };
  const mergedConfig = webpackMerge.smart(
    singleSpaWebpackConfig,
    singleSpaConfig
  );
  return mergedConfig;
};
