const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");

module.exports = {
    entry: path.resolve(__dirname, "src/app.js"),

    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].js"
    },

    plugins: [
        new HtmlPlugin()
    ]
};