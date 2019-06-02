import { app, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from "electron";
import path from "path";
import { fork } from "child_process";

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

    mainWindow.loadFile("index.html");

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
