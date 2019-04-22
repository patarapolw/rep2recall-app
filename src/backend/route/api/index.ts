import { Router } from "express";
import cardApiRouter from "./card";

export const router = Router();

router.use("/card", cardApiRouter);

export default router;
