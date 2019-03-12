import { app, BrowserWindow, Menu, MenuItemConstructorOptions, ipcMain } from "electron";
import path from "path";
// @ts-ignore
import isAsar from "electron-is-running-in-asar";
import { fork } from "child_process";
import config from "./server/config";
import http from "http";

const serverProcess = fork(path.join(__dirname, "server.min.js"));

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

    if (!isAsar()) {
        mainWindow.webContents.openDevTools();
    }

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
            label: "View",
            submenu: [
                {
                    id: "deckViewer",
                    label: "Quiz",
                    click() { loadView("deckViewer"); },
                    enabled: (config.db !== undefined &&
                        mainWindow!.webContents.getURL() !== `http://localhost:${config.port}/deckViewer`)
                },
                {
                    id: "cardEditor",
                    label: "Card editor",
                    click() { loadView("cardEditor"); },
                    enabled: (config.db !== undefined &&
                        mainWindow!.webContents.getURL() !== `http://localhost:${config.port}/cardEditor`)
                },
                {
                    id: "imageEditor",
                    label: "Image editor",
                    click() { loadView("imageEditor"); },
                    enabled: (config.db !== undefined &&
                        mainWindow!.webContents.getURL() !== `http://localhost:${config.port}/imageEditor`)
                }
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

ipcMain.on("load-deckViewer", () => {
    loadView("deckViewer");
});

ipcMain.on("load-cardEditor", () => {
    loadView("cardEditor");
});

function loadStartPage(filename: string | null) {
    http.get(`http://localhost:${config.port}/`, (res) => {
        if (filename != null) {
            serverProcess.send({filename}, () => loadView("deckViewer"));
        } else {
            mainWindow!.loadURL(`http://localhost:${config.port}/`);
        }
    }).on("error", () => {
        serverProcess.on("message", () => {
            if (filename != null) {
                serverProcess.send({filename}, () => loadView("deckViewer"));
            } else {
                mainWindow!.loadURL(`http://localhost:${config.port}/`);
            }
        });
    });
}

function loadView(name: string) {
    const appMenu = Menu.getApplicationMenu()!;
    const viewMenus = [
        appMenu.getMenuItemById("deckViewer"),
        appMenu.getMenuItemById("cardEditor"),
        appMenu.getMenuItemById("imageEditor")
    ];

    viewMenus.forEach((m) => m.enabled = true);
    appMenu.getMenuItemById(name).enabled = false;

    mainWindow!.loadURL(`http://localhost:${config.port}/${name}`);
}
