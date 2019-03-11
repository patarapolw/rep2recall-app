import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from "electron";
import path from "path";
// @ts-ignore
import isAsar from "electron-is-running-in-asar";
import { fork } from "child_process";
import config from "./server/config";
import http from "http";

const serverProcess = fork(path.join(__dirname, "server.min.js"));

let mainWindow: Electron.BrowserWindow | null;
let openedFilePath: string = "user/patho.r2r";

function createWindow(filename: string) {
    mainWindow = new BrowserWindow({
        height: 768,
        width: 1024,
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.maximize();

    http.get(`http://localhost:${config.port}/`, (res) => {
        serverProcess.send({filename});
        mainWindow!.loadURL(`http://localhost:${config.port}/`);
    }).on("error", () => {
        serverProcess.on("message", () => {
            serverProcess.send({filename});
            mainWindow!.loadURL(`http://localhost:${config.port}/`);
        });
    });

    if (!isAsar()) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.on("will-finish-launching", () => {
    app.on("open-file", (e, _path) => {
        if (app.isReady() && !mainWindow) {
            createWindow(_path);
        } else {
            openedFilePath = _path;
        }
    });
});

app.on("ready", () => {
    createWindow(openedFilePath);

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
                    mainWindow!.webContents.send("on-menu-pref");
                } }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
});

app.on("window-all-closed", () => {
    // if (process.platform !== 'darwin') {
    serverProcess.kill();
    app.quit();
    // }
});

// app.on("activate", () => {
//     if (mainWindow === null) {
//         createWindow();
//     }
// });
