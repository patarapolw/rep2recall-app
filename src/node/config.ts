// @ts-ignore
import { AppDirs } from "appdirs";
import path from "path";
import fs from "fs";
import Db from "./engine/db";
import SocketIO from "socket.io";
import rimraf from "rimraf";
import dotenv from "dotenv";
dotenv.config();

interface IConfig {
    PORT: string;
    DB?: Db;
    COLLECTION: string;
    UPLOAD_FOLDER: string;
    IO?: SocketIO.Server;
};

const userDataDir = new AppDirs("rep2recall").userDataDir();
if (!process.env.COLLECTION && !fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir);
}

const col = process.env.COLLECTION || path.join(userDataDir, "user.r2r");

export const g: IConfig = {
    PORT: process.env.PORT || "34972",
    COLLECTION: col,
    UPLOAD_FOLDER: path.join(col ? path.dirname(col) : userDataDir, "upload")
};

if (!fs.existsSync(g.UPLOAD_FOLDER)) {
    fs.mkdirSync(g.UPLOAD_FOLDER);
}

function onExit() {
    rimraf.sync(g.UPLOAD_FOLDER);
    process.exit();
}

process.on("exit", onExit);
process.on("SIGINT", onExit);

export default g;
