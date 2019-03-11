const {mainConfig, rendererConfig} = require("./webpack.common");

module.exports = [
    {
        ...mainConfig,
        mode: "production"
    },
    {
        ...rendererConfig,
        mode: "production"
    }
];
