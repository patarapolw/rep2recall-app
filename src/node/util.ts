import crypto from 'crypto';
import { INoteDataSocket } from './engine/db';
import { inspect } from 'util';

export function generateSecret(): Promise<string> {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(48, (err, b) => {
            if (err) {
                return reject(err);
            }
            resolve(b.toString("base64"));
        });
    })
}

export function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // $& means the whole matched string
}

export function ankiMustache(s: string, d?: INoteDataSocket[], front: string = ""): string {
    d = d || [];
    s = s.replace(/{{FrontSide}}/g, front.replace(/@html\n/g, ""))

    const keys = new Set<string>();
    for (const item of d) {
        keys.add(item.key);
        s = s.replace(
            new RegExp(`{{(\\S+:)?${escapeRegExp(item.key)}}}`, "g"),
            item.value.replace(/^@[^\n]+\n/gs, "")
        );
    }

    s = s.replace(/{{#(\S+)}}([^]*){{\1}}/gs, (m, p1, p2) => {
        return keys.has(p1) ? p2 : "";
    });

    s = s.replace(/{{[^}]+}}/g, "");

    return s;
}

export function shuffle(a: any[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function pp(x: any) {
    console.log(inspect(x, {depth: null, colors: true}));
}