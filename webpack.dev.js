const {mainConfig, rendererConfig} = require("./webpack.common");

module.exports = [
    {
        ...mainConfig,
        mode: "development"
    },
    {
        ...rendererConfig,
        mode: "development"
    }
];
