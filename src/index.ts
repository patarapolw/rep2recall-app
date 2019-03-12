import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";
import { ipcRenderer, remote } from "electron";
import { fetchJSON } from "./renderer/util";
import config from "./server/config";

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
        .then(() => remote.getCurrentWindow().loadURL(`http://localhost:${config.port}/editor/card`));
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
        .then(() => remote.getCurrentWindow().loadURL(`http://localhost:${config.port}/deckViewer`));
    }
};
