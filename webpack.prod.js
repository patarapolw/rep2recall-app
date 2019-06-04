const path = require("path");
const { web } = require("./webpack.common");
const CopyPlugin = require('copy-webpack-plugin');

module.exports = [
    {
        mode: "production",
        entry: {
            server: "./src/node/server.ts",
            electron: "./src/node/electron.ts"
        },
        output: {
            path: path.join(__dirname, "dist"),
            filename: "[name].min.js"
        },
        target: "electron-main",
        node: {
            __dirname: false,
            __filename: false,
        },
        resolve: {
            extensions: ['.js', '.json', '.ts'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'ts-loader',
                    },
                }
            ],
        },
    },
    {
        mode: "production",
        target: "electron-renderer",
        node: {
            __dirname: false,
            __filename: false,
        },
        ...web,
        plugins: [
            new CopyPlugin([
                { from: 'public', to: '.' }
            ]),
        ],
    }
]