import path from "path";
import Db from "./engine/db";
import SocketIO from "socket.io";
import rimraf from "rimraf";
import fs from "fs-extra";
import { String } from "runtypes";

const PORT = String.check(process.env.PORT);
const COLLECTION = String.check(process.env.COLLECTION);
const MEDIA_FOLDER = path.join(path.dirname(COLLECTION), "media");
const UPLOAD_FOLDER = path.join(path.dirname(COLLECTION), "upload");

fs.ensureDirSync(MEDIA_FOLDER);
fs.ensureDirSync(UPLOAD_FOLDER);

interface IConfig {
  DB: Db;
  IO?: SocketIO.Server;
  PORT: string;
  COLLECTION: string;
  MEDIA_FOLDER: string;
  UPLOAD_FOLDER: string;
}

export const g: IConfig = {
  PORT,
  COLLECTION,
  MEDIA_FOLDER,
  UPLOAD_FOLDER,
  DB: new Db(COLLECTION)
};

function onExit() {
  rimraf.sync(UPLOAD_FOLDER);
  process.exit();
}

process.on("exit", onExit);
process.on("SIGINT", onExit);
