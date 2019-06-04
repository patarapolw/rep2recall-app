import express from "express";
import expressWs from "express-ws";

const app = express();
Config.app = expressWs(app);

import Config from "./config";
import rimraf from "rimraf";
import path from "path";
import editorRouter from "./api/editor";
import mediaRouter from "./api/media";
import quizRouter from "./api/quiz";
import Db from "./engine/db";
import cors from "cors";
import bodyParser from "body-parser";

app.use(express.static(path.dirname(Config.COLLECTION)));
app.use(cors());
app.use(bodyParser.json());

app.use("/api/editor", editorRouter);
app.use("/api/io", require("./api/io").default);
app.use("/api/media", mediaRouter);
app.use("/api/quiz", quizRouter);

process.on("exit", onExit);
process.on("SIGINT", onExit);

(async () => {
    Config.DB = await Db.connect(Config.COLLECTION);
    app.listen(Config.PORT, () => console.log(`Server running on http://localhost:${Config.PORT}`));
})().catch((e) => console.error(e));

function onExit() {
    rimraf.sync(Config.UPLOAD_FOLDER);
    process.exit();
}
