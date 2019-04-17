const { web } = require("./webpack.common");
const waitOn = require("wait-on");
const open = require("open");
const dotenv = require("dotenv");
dotenv.config();

let isFirstEmit = true;

module.exports = {
    mode: "development",
    devtool: "inline-source-map",
    entry: {
        index: "./src/web/index.ts"
    },
    ...web,
    plugins: [
        {
            apply: (compiler) => {
                compiler.hooks.compile.tap("open-browser", () => {
                    if (isFirstEmit) {
                        waitOn({ resources: [`http://localhost:${process.env.PORT}`] }).then(() => {
                            open(`http://localhost:${process.env.PORT}`)
                            isFirstEmit = false;
                        });
                    }
                })
            }
        }
    ]
};