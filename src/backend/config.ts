import Db from "./db";
import dotenv from "dotenv";
// @ts-ignore
import { AppDirs } from "appdirs";
import path from "path";
import fs from "fs";
dotenv.config();

interface IConfig {
    PORT: string;
    db?: Db;
    collection: string;
}

const userDataDir = new AppDirs("rep2recall").userDataDir();
if (!process.env.COLLECTION && !fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir);
}

export const Config: IConfig = {
    PORT: process.env.PORT || "41547",
    collection: process.env.COLLECTION || path.join(userDataDir, "user.r2rdb")
};

export default Config;
