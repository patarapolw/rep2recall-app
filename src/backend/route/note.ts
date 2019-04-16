import { Router } from "express";
import noteEditorRouter from "./editor/note";

const router = Router();
router.use("/editor", noteEditorRouter);

export default router;
