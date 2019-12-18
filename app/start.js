const open = require("open")
const pkg = require("./package.json")

if (process.platform === "win32") {
  open(`dist_electron/win-unpacked/${pkg.name}.exe`)
} else if (process.platform === "darwin") {
  open(`dist_electron/mac/${pkg.name}.app`)
} else  {
  open(`dist_electron/linux-unpacked/${pkg.name}`)
}