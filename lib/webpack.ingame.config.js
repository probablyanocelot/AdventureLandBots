const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: path.resolve(__dirname, "bootstrap/ingame_entry.js"),
  output: {
    filename: "95webpack_bootstrap.95.js",
    path: path.resolve(__dirname, "../dist/ingame"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /bootstrap[\\/]proxied_require\.js$/],
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              [
                "@babel/preset-env",
                {
                  targets: {
                    chrome: "80",
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve("path-browserify"),
    },
  },
  plugins: [new webpack.IgnorePlugin({ resourceRegExp: /^electron$/ })],
  mode: "production",
  target: "web",
  devtool: false,
  experiments: {
    topLevelAwait: false,
  },
};
