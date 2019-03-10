const path = require("path");

module.exports = {
    entry: {
        cardEditor: path.resolve(__dirname, "src/cardEditor.ts"),
        imageEditor: path.resolve(__dirname, "src/imageEditor.ts"),
    },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].min.js"
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader"
                ],
                exclude: /\.module\.css$/
            },
            {
                test: /\.(ts|tsx)?$/,
                loader: "ts-loader",
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]"
                ],
                include: /\.module\.css$/
            },
            {
                test: /\.(html|pug|jade|txt)$/,
                use: "raw-loader"
            },
            {
                test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
                use: [{
                    loader: "file-loader",
                    options: {
                        name: "[name].[ext]",
                        outputPath: "fonts/"
                    }
                }]
            },
            {
                test: require.resolve("jquery"),
                use: [{
                    loader: "expose-loader",
                    options: "jQuery"
                }, {
                    loader: "expose-loader",
                    options: "$"
                }]
            }
        ]
    },
    resolve: {
        extensions: [
            ".tsx",
            ".ts",
            ".js"
        ]
    }
};
