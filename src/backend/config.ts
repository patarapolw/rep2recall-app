import Db from "./db";
import dotenv from "dotenv";
// @ts-ignore
import { AppDirs } from "appdirs";
import path from "path";
dotenv.config();

interface IConfig {
    PORT: string;
    db?: Db;
    collection: string;
}

export const Config: IConfig = {
    PORT: process.env.PORT || "41547",
    collection: process.env.COLLECTION || path.join(new AppDirs("rep2recall").userDataDir(), "user.r2rdb")
};

export default Config;
