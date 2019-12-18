const { spawnSync } = require("child_process");

module.exports = {
  pages: {
    index: "src/client/main.ts"
  },
  configureWebpack: {
    plugins: [
      {
        apply: (compiler) => {
          compiler.hooks.entryOption.tap('TscPlugin', () => {
            spawnSync("yarn", [
              "build:server"
            ], {
              stdio: "inherit"
            })
          });
        }
      }
    ]
  },
  pluginOptions: {
    electronBuilder: {
      externals: [
        "express",
        "cors",
        "socket.io",
        "rimraf",
        "runtypes",
        "fs-extra",
        "express-fileupload",
        "uuid",
        "sanitize-filename",
        "moment",
        "sqlite",
        "adm-zip",
        "spark-md5",
        "liteorm",
        "dot-prop",
        "es6-json-stable-stringify"
      ]
    }
  }
}