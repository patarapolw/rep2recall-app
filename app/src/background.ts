'use strict'

import { app, protocol, BrowserWindow, shell, MenuItemConstructorOptions, Menu } from 'electron'
import {
  createProtocol,
  installVueDevtools
} from 'vue-cli-plugin-electron-builder/lib'
import contextMenu from 'electron-context-menu'
import { fork } from 'child_process'
import path from 'path'

const isDevelopment = process.env.NODE_ENV !== 'production'

contextMenu()

process.env.PORT = process.env.PORT || "48000";
process.env.COLLECTION = process.env.COLLECTION || path.join(app.getPath("userData"), "user.db");
console.log(`Saving at ${process.env.COLLECTION}`);

const serverProcess = fork(isDevelopment
  ? path.join(__dirname, "../public/server/index.js")
  : path.join(__dirname, "server/index.js"), [], {
  stdio: "inherit"
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win: BrowserWindow | null

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{scheme: 'app', privileges: { secure: true, standard: true } }])

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({ width: 1024, height: 768, webPreferences: {
    nodeIntegration: true
  } })
  win.maximize()

  const openExternalLinksInOSBrowser = (event: any, url: string) => {
    if (url.match(/.*localhost.*/gi) === null && (url.startsWith("http:") || url.startsWith("https:"))) {
        event.preventDefault();
        shell.openExternal(url);
    }
};

win.webContents.on("new-window", openExternalLinksInOSBrowser);
win.webContents.on("will-navigate", openExternalLinksInOSBrowser);

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    // if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  win.on('closed', () => {
    win = null
  })
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
    killServer()
    app.quit()
  // }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // Devtools extensions are broken in Electron 6.0.0 and greater
    // See https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/378 for more info
    // Electron will not launch with Devtools extensions installed on Windows 10 with dark mode
    // If you are not using Windows 10 dark mode, you may uncomment these lines
    // In addition, if the linked issue is closed, you can upgrade electron and uncomment these lines
    try {
      await installVueDevtools()
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }

  }
  createWindow()

  const template: MenuItemConstructorOptions[] = [
    {
        label: "Application",
        submenu: [
            { label: "About Application", role: "about" },
            { type: "separator" },
            { label: "Quit", accelerator: "Command+Q", role: "quit" }
        ]
    },
    {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", role: "selectAll" }
        ]
    },
    {
        label: "Settings",
        submenu: [
            { label: "Preferences", click() {
                win!.webContents.send("on-menu-pref");
            } }
        ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', data => {
      if (data === 'graceful-exit') {
        killServer()
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      killServer()
      app.quit()
    })
  }
}

function killServer() {
  if (!serverProcess.killed) {
    serverProcess.kill()
  }
}
