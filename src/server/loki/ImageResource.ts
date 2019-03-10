import { Db, IImage } from ".";
import fs from "fs";
import path from "path";
import md5Converter from "md5";
import shortId from "shortid";
// @ts-ignore
import imageHash from "image-hash";

export class ImageResource {
    public db: Db;

    constructor(db: Db) {
        this.db = db;
    }

    public async upsert(_url: string): Promise<IImage | null> {
        let image: IImage | null = null;

        let url = _url;
        let b: Buffer | undefined;
        let md5: string | undefined;

        try {
            url = new URL(_url).href;
            image = this.db.image.findOne({url});
        } catch (e) {
            const p = path.parse(this.db.loki.filename);
            _url = path.join(p.dir, p.name, _url);

            try {
                b = fs.readFileSync(_url);
                md5 = md5Converter(b);
                image = this.db.image.findOne({md5});
            } catch (e) {
                return null;
            }
        }

        if (image) {
            return image;
        }

        const guid = shortId.generate();
        const h = await new Promise((resolve, reject) => {
            imageHash(url, 16, true, (e: any, data: string) => {
                return e ? reject(e) : resolve(data);
            });
        }) as string;

        image = {url, b, md5, guid, h};

        if (this.db.image.insertOne(image)) {
            return image;
        }

        return null;
    }

    public get(_url: string): Buffer | string | null {
        let url = _url;

        try {
            url = new URL(_url).href;
            const image = this.db.image.findOne({url});

            return image ? image.b || image.url : null;
        } catch (e) {
            const p = path.parse(this.db.loki.filename);
            _url = path.join(p.dir, p.name, _url);

            try {
                return fs.readFileSync(_url);
            } catch (e) {
            }
        }

        return null;
    }
}

export default ImageResource;
