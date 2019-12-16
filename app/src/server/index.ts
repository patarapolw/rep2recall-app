import express from "express";
import { g } from "./global";
import editorRouter from "./api/editor";
import mediaRouter from "./api/media";
import quizRouter from "./api/quiz";
import Db from "./engine/db";
import cors from "cors";
import bodyParser from "body-parser";
import SocketIO from "socket.io";
import http from "http";

const app = express();
const server = new http.Server(app);
g.IO = SocketIO(server);

app.use(cors());
app.use("/media", express.static(g.MEDIA_FOLDER));

app.use(bodyParser.json());

app.use("/api/editor", editorRouter);
app.use("/api/io", require("./api/io").default);
app.use("/api/media", mediaRouter);
app.use("/api/quiz", quizRouter);

(async () => {
    await g.DB.init();
    server.listen(g.PORT, () => console.log(`Server running on http://localhost:${g.PORT}`));
})().catch((e) => console.error(e));