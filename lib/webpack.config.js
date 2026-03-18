const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: path.resolve(__dirname, "bootstrap/index.js"),
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "../browser/dist"),
    library: {
      name: "ALBootstrap",
      type: "window",
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve("path-browserify"),
      // add more as needed
    },
  },
  plugins: [new webpack.IgnorePlugin({ resourceRegExp: /^electron$/ })],
  mode: "production",
};
