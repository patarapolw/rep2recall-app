const { spawnSync } = require("child_process");

module.exports = {
  pages: {
    index: "src/client/main.ts"
  },
  configureWebpack: {
    plugins: [
      {
        apply: (compiler) => {
          compiler.hooks.compile.tap('TscPlugin', () => {
            spawnSync("./node_modules/.bin/tsc", [
              "-p",
              "./tsconfig.server.json"
            ])
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
        "dot-prop"
      ],
      builderOptions: {
        appId: "io.github.patarapolw.rep2recall",
        mac: {
          category: "public.app-category.education",
          icon: "icon.png"
        },
        win: {
          icon: "icon.png"
        },
        fileAssociations: [
          {
            ext: "r2r",
            role: "Editor"
          },
          {
            ext: "apkg",
            role: "Editor"
          }
        ]
      }
    }
  }
}