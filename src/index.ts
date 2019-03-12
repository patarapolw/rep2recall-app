import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import { ipcRenderer, remote } from "electron";
import { fetchJSON } from "./renderer/util";

const { dialog } = remote;

(document.getElementById("file-create") as HTMLButtonElement).onclick = () => {
    const file = dialog.showSaveDialog({
        filters: [{
            name: "Rep2Recall files",
            extensions: ["r2r"]
        }]
    });

    if (file) {
        fetchJSON("/connect", {filename: file})
        .then(() => ipcRenderer.send("load-cardEditor"));
    }
};

(document.getElementById("file-open") as HTMLButtonElement).onclick = () => {
    const files = dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{
            name: "Rep2Recall files",
            extensions: ["r2r"]
        }]
    });

    if (files) {
        fetchJSON("/connect", {filename: files[0]})
        .then(() => ipcRenderer.send("load-deckViewer"));
    }
};
