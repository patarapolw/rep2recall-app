import Config from "../config";
import { SearchParser, mongoToFilter } from "../engine/search";
import moment from "moment";
import { simpleMustacheRender } from "../util";
import { srsMap, getNextReview, repeatReview } from "../engine/quiz";
import { Router } from "express";

interface ITreeViewStat {
    new: number;
    leech: number;
    due: number;
}

export interface ITreeViewItem {
    name: string;
    fullName: string;
    isOpen: boolean;
    children?: ITreeViewItem[];
    stat: ITreeViewStat;
}

const router = Router();

router.post("/", (req, res) => {
    const db = Config.DB!;
    const parser = new SearchParser();
    const andCond = [parser.parse(req.body.q)];

    if (req.body.deck) {
        andCond.push({$or: [
            {deck: {$startswith: `${req.body.deck}/`}},
            {deck: req.body.deck}
        ]})
    }

    if (req.body.type !== "all") {
        const type: string = req.body.type;
        if (type === "due") {
            andCond.push({nextReview: {$lte: moment().toISOString()}});
        } else if (type === "leech") {
            andCond.push({
                srsLevel: 0
            })
        } else if (type === "new") {
            andCond.push({
                nextReview: {$exists: false}
            })
        } else {
            andCond.push({$or: [
                {nextReview: {$exists: false}},
                {nextReview: {$lte: moment().toISOString()}}
            ]});
        }
    }

    const due = req.body.due;
    if (due) {
        const m = /(-?\d+(?:\.\d+)?\S+)/.exec(due);
        if (m) {
            andCond.push({nextReview: {$lte: moment().add(parseFloat(m[1]), m[2] as any).toISOString()}})
        } else {
            andCond.push({$or: [
                {nextReview: {$exists: false}},
                {nextReview: {$lte: moment().toISOString()}}
            ]})
        }
    }

    const ids = db.getAll().filter(mongoToFilter({$and: andCond})).map((c) => c.id)
    return res.json({ids});
});

router.post("/render", (req, res) => {
    const db = Config.DB!;
    const c = db.card.findOne({$loki: req.body.id});

    if (/@md5\n/.test(c.front)) {
        const t = db.template.findOne({$loki: c.templateId});
        const n = db.note.findOne({$loki: c.noteId});
        c.front = simpleMustacheRender(t.front, n.data);
        c.back = simpleMustacheRender(t.back || "", n.data);
    }

    return res.json(c);
});

router.post("/treeview", (req, res) => {
    function recurseParseData(data: ITreeViewItem[], deck: string[], _depth = 0) {
        let doLoop = true;

        while (_depth < deck.length - 1) {
            for (const c of data) {
                if (c.name === deck[_depth]) {
                    c.children = c.children || [];
                    recurseParseData(c.children, deck, _depth + 1);
                    doLoop = false;
                    break;
                }
            }

            _depth++;

            if (!doLoop) {
                break;
            }
        }

        if (doLoop && _depth === deck.length - 1) {
            const fullName = deck.join("/");
            const thisDeckData = deckData.filter((d) => d.deck === fullName || d.deck.indexOf(`${fullName}/`) === 0);

            data.push({
                name: deck[_depth],
                fullName,
                isOpen: _depth < 2,
                stat: {
                    new: thisDeckData.filter((d) => !d.nextReview).length,
                    leech: thisDeckData.filter((d) => d.srsLevel === 0).length,
                    due: thisDeckData.filter((d) => d.nextReview && moment(d.nextReview).toDate() < now).length
                }
            });
        }
    }

    const db = Config.DB!;

    const rSearch = new SearchParser();
    const cond = rSearch.parse(req.body.q);

    const deckData = db.getAll().filter(mongoToFilter(cond));
    const now = new Date();

    const deckList: string[] = deckData.map((d: any) => d.deck);
    const deckWithSubDecks: string[] = [];

    deckList.filter((d, i) => deckList.indexOf(d) === i).sort().forEach((d) => {
        const deck = d.split("/");
        deck.forEach((seg, i) => {
            const subDeck = deck.slice(0, i + 1).join("/");
            if (deckWithSubDecks.indexOf(subDeck) === -1) {
                deckWithSubDecks.push(subDeck);
            }
        });
    });

    const fullData = [] as ITreeViewItem[];
    deckWithSubDecks.forEach((d) => {
        const deck = d.split("/");
        recurseParseData(fullData, deck);
    });

    return res.json(fullData);
});

router.put("/right", (req, res) => {
    const db = Config.DB!;
    const id: number = req.body.id;

    db.card.updateWhere((c) => c.$loki === id, (c) => {
        c.srsLevel = (c.srsLevel || 0) + 1;
        if (c.srsLevel >= srsMap.length) {
            c.srsLevel = srsMap.length - 1;
        }
        c.nextReview = getNextReview(c.srsLevel);

        return c;
    });

    return res.json({ error: null });
});

router.put("/wrong", (req, res) => {
    const db = Config.DB!;
    const id: number = req.body.id;

    db.card.updateWhere((c) => c.$loki === id, (c) => {
        c.srsLevel = (c.srsLevel || 0) - 1;
        if (c.srsLevel < 0) {
            c.srsLevel = 0;
        }
        c.nextReview = repeatReview();

        return c;
    });

    return res.json({ error: null });
});

export default router;
