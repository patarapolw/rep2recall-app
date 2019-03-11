import express from "express";
import { Db } from "./server/loki";
import config from "./server/config";
import bodyParser from "body-parser";
import cardRouter from "./server/routes/card";
import imageRouter from "./server/routes/image";
import deckRouter from "./server/routes/deck";
import quizRouter from "./server/routes/quiz";
import asyncHandler from "express-async-handler";
import cors from "cors";
import path from "path";
// @ts-ignore
import ejs from "ejs";

export async function runserver() {
    const app = express();

    app.use(cors());
    app.use(express.static(path.join(__dirname, "../dist")));
    app.use(express.static(path.join(__dirname, "../public")));
    app.use(bodyParser.json());
    app.set("view engine", "ejs");
    app.engine("ejs", ejs.renderFile);
    app.engine("html", ejs.renderFile);
    app.set("views", path.join(__dirname, "../views"));

    if (process.env.DATABASE_PATH) {
        config.db = await Db.connect(process.env.DATABASE_PATH);
    }

    app.post("/connect", asyncHandler(async (req, res) => {
        config.db = await Db.connect(req.body.filename);
        return res.sendStatus(201);
    }));

    app.use("/card", cardRouter);
    app.use("/img", imageRouter);
    app.use("/deck", deckRouter);
    app.use("/quiz", quizRouter);

    app.get("/editor/card", (req, res) => {
        res.render("hot", {
            title: "Card Editor",
            js: "/cardEditor.min.js"
        });
    });

    app.get("/editor/img", (req, res) => {
        res.render("hot", {
            title: "Image Editor",
            js: "/imageEditor.min.js"
        });
    });

    app.get("/", (req, res) => {
        res.render("deckViewer.html");
    });

    app.listen(config.port, () => {
        console.log(`App listening on port ${config.port}!`);
        process.send!({});
    });
}

runserver();

process.on("message", (msg) => {
    Db.connect(msg.filename).then((db) => config.db = db);
});
