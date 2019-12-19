const open = require("open")
const pkg = require("./package.json")
const yaml = require("js-yaml")
const fs = require("fs")

const config = yaml.safeLoad(fs.readFileSync("./electron-builder.yml", "utf8"))

if (process.platform === "win32") {
  open(`dist_electron/win-unpacked/${config.productName}.exe`)
} else if (process.platform === "darwin") {
  open(`dist_electron/mac/${config.productName}.app`)
} else {
  open(`dist_electron/linux-unpacked/${pkg.name}`)
}