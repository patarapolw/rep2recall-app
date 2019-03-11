import express, { Router } from "express";
import { Db } from "./server/loki";
import config from "./server/config";
import bodyParser from "body-parser";
import cardRouter from "./server/routes/card";
import imageRouter from "./server/routes/image";
import deckRouter from "./server/routes/deck";
import quizRouter from "./server/routes/quiz";
import asyncHandler from "express-async-handler";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

(async () => {
    const app = express();
    const port = process.env.PORT || 41547;

    app.use(cors());
    app.use(express.static("dist"));
    app.use(express.static("public"));
    app.use(bodyParser.json());
    app.set("view engine", "ejs");

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
        res.render("index");
    });

    app.listen(port, () => console.log(`App listening on port ${port}!`));
})();
