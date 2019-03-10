import { Db } from "../server/loki";

(async () => {
    const db = await Db.connect("./user/patho.r2r");

    console.log(db.card.eqJoin(db.deck, "deckId", "$loki", (l, r) => {
        const {front, back, note, srsLevel, nextReview, tags} = l;
        return {
            front, back, note, srsLevel, nextReview, tags,
            deck: r.name
        };
    }).find({deck: {$regex: "robbins"}}).data());
    db.close();
})();
