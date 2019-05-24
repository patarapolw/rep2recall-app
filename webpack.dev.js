const { web } = require("./webpack.common");
const dotenv = require("dotenv");
dotenv.config();

let isFirstEmit = true;

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    entry: {
        index: "./src/web/index.ts"
    },
    ...web
};