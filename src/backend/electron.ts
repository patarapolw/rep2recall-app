import { app, BrowserWindow, Menu, MenuItemConstructorOptions, ipcMain, shell } from "electron";
import path from "path";
import { fork } from "child_process";
import waitOn from "wait-on";
import Config from "./config";

const serverProcess = fork(path.join(__dirname, "./server.min.js"));

let mainWindow: Electron.BrowserWindow | null;
let openedFilePath: string | null = null;

function createWindow(filename: string | null) {
    mainWindow = new BrowserWindow({
        height: 768,
        width: 1024,
        webPreferences: {
            nodeIntegration: true
        }
    });
    mainWindow.maximize();

    loadStartPage(filename);

    const openExternalLinksInOSBrowser = (event: any, url: string) => {
        if (url.match(/.*localhost.*/gi) === null && (url.startsWith("http:") || url.startsWith("https:"))) {
            event.preventDefault();
            shell.openExternal(url);
        }
    };

    mainWindow.webContents.on("new-window", openExternalLinksInOSBrowser);
    mainWindow.webContents.on("will-navigate", openExternalLinksInOSBrowser);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

app.on("will-finish-launching", () => {
    app.on("open-file", (e, _path) => {
        if (mainWindow) {
            loadStartPage(_path);
        } else if (app.isReady() && !mainWindow) {
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

ipcMain.on("load-file", () => {
    mainWindow!.loadURL(`http://localhost:${Config.PORT}/`);
});

async function loadStartPage(filename: string | null) {
    waitOn({resources: [`http://localhost:${Config.PORT}`]}).then(() => {
        if (filename != null) {
            mainWindow!.loadURL(`http://localhost:${Config.PORT}`);
        } else {
            mainWindow!.loadURL(`http://localhost:${Config.PORT}?filename=${filename}`);
        }
    });
}
