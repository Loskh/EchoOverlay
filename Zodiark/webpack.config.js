const path = require("path"); // node自带包
const ParallelUglifyPlugin = require("webpack-parallel-uglify-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./zodiark.ts",
  output: {
    filename: "zodiark.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  mode: "production",
  // mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader",
          },
          {
            loader: "css-loader",
            options: {
              // TODO: Migrate to url-loader
              url: false,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts"], // 解析对文件格式
  },
  optimization: {
    // splitChunks: {
    //   // include all types of chunks
    //   chunks: "all",
    // },
    minimizer: [
      new CssMinimizerPlugin(),
      new ParallelUglifyPlugin({
        cacheDir: ".cache/", //缓存压缩，默认不缓存，设置存放位置开启
        test: /.js$/, //匹配需要压缩的文件，默认为/.js$/和Loader配置一样
        workerCount: 2,
        sourceMap: false,
        uglifyES: {
          output: {
            beautify: false,
            comments: false,
          },
          compress: {
            warnings: false,
            drop_console: true,
            collapse_vars: true,
            reduce_vars: true,
          },
        },
      }),
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "zodiark.html",
      template: "./zodiark.html",
    }),
  ],
};
