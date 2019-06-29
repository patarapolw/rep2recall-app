import { SearchParser } from "../engine/search";
import moment from "moment";
import { Router } from "express";
import g from "../config";
import { pp } from "../util";

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
    const db = g.DB!;
    const parser = new SearchParser();
    const andCond = [];

    const parseResult = parser.doParse(req.body.q);
    if (parseResult) {
        andCond.push(parseResult.cond);
    }

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

    return res.json({ids: db.parseCond({
        cond: {$and: andCond},
        fields: new Set(["deck"])
    }, {
        fields: ["id"]
    }).data.map((c) => c.id)});
});

router.post("/render", (req, res) => {
    const db = g.DB!;
    return res.json(db.render(req.body.id));
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

    const db = g.DB!;

    const rSearch = new SearchParser();
    const cond = rSearch.doParse(req.body.q);

    const deckData = db.parseCond(cond || {}, {
        fields: ["nextReview", "srsLevel", "deck"]
    }).data;

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
    const db = g.DB!;
    return res.json(db.markRight(req.params.id));
});

router.put("/wrong", (req, res) => {
    const db = g.DB!;
    return res.json(db.markWrong(req.params.id));
});

export default router;
