import express from "express";
import path from "path";
import cors from "cors";
import asyncHandler from "express-async-handler";
import ejs from "ejs";
import bodyParser from "body-parser";
import Config from "./config";
import Db from "./db";
import cardRouter from "./route/card";
import deckRouter from "./route/deck";
import quizRouter from "./route/quiz";
import templateRouter from "./route/template";
import imageRouter from "./route/image";
import noteRouter from "./route/note";
import ioRouter from "./route/io";

const app = express();

app.set("view engine", "ejs");
app.engine("ejs", ejs.renderFile);
app.engine("html", ejs.renderFile);
app.set("views", path.join(__dirname, "../../views"));

app.use(express.static(path.join(__dirname, "../../public")));
app.use(express.static(path.join(__dirname, "../../dist")));

app.use(bodyParser.json());
app.use(cors());
app.use("/card", cardRouter);
app.use("/deck", deckRouter);
app.use("/quiz", quizRouter);
app.use("/template", templateRouter);
app.use("/note", noteRouter);
app.use("/io", ioRouter);
app.use("/img", imageRouter);

app.get("/", (req, res) => res.render("layout/min", {
    title: "Rep2Recall",
    js: "/web/index.min.js"
}));

app.post("/connect", asyncHandler(async (req, res) => {
    const filename = req.body.filename;
    Config.collection = filename;
    Config.db = await Db.connect(Config.collection);
    res.redirect("/");
}));

(async () => {
    Config.db = await Db.connect(Config.collection);
    app.listen(Config.PORT, () => console.log(`Server running on http://localhost:${Config.PORT}`));
})().catch((e) => console.error(e));
