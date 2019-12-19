module.exports = {
  pages: {
    index: "src/client/main.ts",
    // iframe: "src/client/iframe.ts"
  },
  publicPath: "",
  pluginOptions: {
    electronBuilder: {
      externals: [
        "sqlite",
        "liteorm",
        "socket.io"
      ]
    }
  }
}