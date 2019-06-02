const { web } = require("./webpack.common");
const path = require("path");

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    ...web,
    devServer: {
        open: true,
        contentBase: path.resolve(__dirname, "public"),
        watchContentBase: true,
        proxy: {
            "/api": "http://localhost:41547"
        }
    }
};