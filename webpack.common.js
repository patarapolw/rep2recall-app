const path = require("path");

const mainConfig = {
    entry: {
        main: path.resolve(__dirname, "src/main.ts"),
        server: path.resolve(__dirname, "src/server.ts")
    },
    target: 'electron-main',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].min.js"
    },
    node: {
        __dirname: false,
        __filename: false,
    },
    resolve: {
        extensions: ['.js', '.json', '.ts']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                },
            },
            { test: /\.ejs$/, loader: 'ejs-loader?variable=data' },
        ]
    }
};

const rendererConfig = {
    entry: {
        deckViewer: path.resolve(__dirname, "src/deckViewer.ts"),
        cardEditor: path.resolve(__dirname, "src/cardEditor.ts"),
        imageEditor: path.resolve(__dirname, "src/imageEditor.ts"),
    },
    target: 'electron-renderer',
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].min.js"
    },
    node: {
        __dirname: false,
        __filename: false,
    },
    resolve: {
        extensions: ['.js', '.json', '.ts', '.tsx'],
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
                test: /\.(png|jpg|gif)$/,
                use: [
                  {
                    loader: 'file-loader',
                    options: {
                      name: '[path][name].[ext]',
                    },
                  },
                ],
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

module.exports = {
    mainConfig, rendererConfig
};
