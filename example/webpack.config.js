module.exports = {
  entry: './example/index.js',
  output: {
    filename: 'bundle.js',
    path: './example/build'
  },
  module: {
    rules: [
      { test: /\.(js|jsx)$/, use: 'babel-loader' },
    ]
  },
  devtool: "cheap-eval-source-map",
  devServer: {
    contentBase: './example/build',
    compress: true,
    port: 9000
  }
}
