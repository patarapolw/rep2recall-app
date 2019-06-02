// @ts-ignore
import { AppDirs } from "appdirs";
import path from "path";
import fs from "fs";
import Db from "./engine/db";

interface IConfig {
    PORT: string;
    DB?: Db;
    COLLECTION: string;
    UPLOAD_FOLDER: string;
}

const userDataDir = new AppDirs("rep2recall").userDataDir();
if (!process.env.COLLECTION && !fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir);
}

export const Config: IConfig = {
    PORT: process.env.PORT || "41547",
    COLLECTION: process.env.COLLECTION || path.join(userDataDir, "user.r2r"),
    UPLOAD_FOLDER: path.join(userDataDir, "upload")
};

if (!fs.existsSync(Config.UPLOAD_FOLDER)) {
    fs.mkdirSync(Config.UPLOAD_FOLDER);
}

export default Config;
