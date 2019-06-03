import fastify from "fastify";
import "make-promises-safe";
import Config from "./config";
import multipart from "fastify-multipart";
import cors from "fastify-cors";
import fStatic from "fastify-static";
// @ts-ignore
import fSocket from "fastify-websocket";
import rimraf from "rimraf";
import path from "path";
import editorRouter from "./api/editor";
import ioRouter from "./api/io";
import mediaRouter from "./api/media";
import quizRouter from "./api/quiz";
import Db from "./engine/db";

const f = fastify({
    logger: {
        prettyPrint: true
    }
});

f.register(cors);
f.register(multipart);
f.register(fStatic, {
    root: path.dirname(Config.COLLECTION)
});
f.register(fSocket);

f.register(editorRouter, { prefix: "/api/editor/" });
f.register(ioRouter, { prefix: "/api/io/" })
f.register(mediaRouter, { prefix: "/api/media/" });
f.register(quizRouter, { prefix: "/api/quiz/" })

process.on("exit", onExit);
process.on("SIGINT", onExit);

(async () => {
    Config.DB = await Db.connect(Config.COLLECTION);

    try {
        await f.listen(Config.PORT);
    } catch (err) {
        f.log.error(err);
        process.exit(1);
    }
})()

function onExit() {
    rimraf.sync(Config.UPLOAD_FOLDER);
    process.exit();
}
