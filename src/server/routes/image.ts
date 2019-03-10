import { Request, Response, Router } from "express";
import config from "../config";
import ImageResource from "../loki/ImageResource";
import asyncHandler from "express-async-handler";

interface IExternalImage {
    guid: string;
    url: string;
    h: string;
    b?: string;
    md5?: string;
    note?: string;
    tags?: string[];
}

class ImageController {
    public static create(req: Request, res: Response): Response {
        const db = config.db!;
        if (req.body.image) {
            const img: IExternalImage = req.body.image;
// tslint:disable-next-line: prefer-const
            let {b, ...x} = img;
            const result = db.image.insert({
                b: b ? Buffer.from(b, "base64") : undefined,
                ...x
            });

            if (result) {
                return res.json(result.guid);
            }
        } else if (req.body.images) {
            const imgs: IExternalImage[] = req.body.images;
            const result = db.image.insert(imgs.map((img) => {
                // tslint:disable-next-line: prefer-const
                let {b, ...x} = img;
                return {
                    b: b ? Buffer.from(b, "base64") : undefined,
                    ...x
                };
            }));

            if (result) {
                return res.json(result.map((r) => r.guid));
            }
        }

        return res.sendStatus(304);
    }

    public static async upsert(req: Request, res: Response): Promise<Response> {
        const db = config.db!;
        const imageRes = new ImageResource(db);

// tslint:disable-next-line: prefer-const
        let {id, fieldName, fieldData} = req.body;

        if (id) {
            db.image.updateWhere((img) => img.guid === id, (img) => {
                (img as any)[fieldName] = fieldData;
                return img;
            });

            return res.sendStatus(201);
        } else if (fieldName === "url") {
            const img = await imageRes.upsert(fieldData);

            if (img) {
                const {b, ...x} = img;
                return res.json(x);
            }
        }

        return res.sendStatus(304);
    }

    public static find(req: Request, res: Response): Response {
        const db = config.db!;

        const query = req.body.query;
        const offset: number = req.body.offset;
        const limit: number = req.body.limit;

        const q = db.image.chain().find(query).map((img) => {
            const {b, ...x} = img;
            return x;
        });
        const total = q.copy().count();
        const data = q.offset(offset).limit(limit).data();

        return res.json({ data, total });
    }

    public static delete(req: Request, res: Response): Response {
        const db = config.db!;
        const guid: string = req.body.guid;

        db.image.removeWhere((c) => c.guid === guid);

        return res.sendStatus(201);
    }

    public static get(req: Request, res: Response) {
        const db = config.db!;
        const imageRes = new ImageResource(db);
        const guid: string = req.params[0];

        const img = imageRes.get(guid);
        if (typeof img === "string") {
            res.redirect(img);
            return;
        } else if (Buffer.isBuffer(img)) {
            return res.send(img);
        }

        return res.sendStatus(404);
    }
}

const router = Router();

router.get("/*", ImageController.get);
router.post("/", ImageController.find);
router.post("/create", ImageController.create);
router.put("/", asyncHandler(ImageController.upsert));
router.delete("/", ImageController.delete);

export default router;
