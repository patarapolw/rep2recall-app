const { web } = require("./webpack.common");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    ...web,
    devServer: {
        open: true,
        contentBase: path.resolve(__dirname, "public"),
        watchContentBase: true,
        proxy: {
            "/api": `http://localhost:${process.env.PORT || 34972}`,
            "/socket.io": {
                target: `http://localhost:${process.env.PORT || 34972}`,
                ws: true
            }
        },
        port: process.env.DEV_SERVER_PORT || 8000
    }
};