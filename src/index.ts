import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import $ from "jquery";
import "jstree";
import { fetchJSON } from "./renderer/util";
import uuid from "uuid/v4";
import "./index.css";

const uuidToDeck = {} as any;

(async () => {
    const deckList: string[] = (await fetchJSON("/deck/")).decks;
    const deckWithSubDecks: string[] = [];

    let i = 0;
    let filled: boolean[] = [];
    while (filled.every((el) => el)) {
        filled = [];

        deckList.forEach((d) => {
            const deck = d.split("/");
            if (i < deck.length) {
                const name = deck.slice(0, i + 1).join("/");
                if (deckWithSubDecks.indexOf(name) === -1) {
                    deckWithSubDecks.push(name);
                }
            } else {
                filled.push(false);
            }
        });

        i++;
    }

    const data = [] as any[];

    deckWithSubDecks.sort().forEach((d) => {
        const deck = d.split("/");
        recurseParseData(data, deck);
    });

    $(() => {
        // @ts-ignore
        $("#App").jstree({
            core: {data}
        })
        .bind("loaded.jstree", () => {
            // @ts-ignore
            const jstree = $("#App").jstree(true);

            Object.keys(uuidToDeck).forEach((id) => {
                const node = jstree.get_node(id);

                if (node.children.length === 0) {
                    fetchJSON("/deck/stat", {deck: uuidToDeck[id]}).then((stat) => {
                        $(`#${id}`).append(`
                        <div class="tree-score float-right">
                            <span class="tree-new">${stat.new}</span>
                            &nbsp;
                            <span class="tree-leech">${stat.leech}</span>
                            &nbsp;
                            <span class="tree-due">${stat.due}</span>
                        </div>
                        `);
                    });
                }
            });
        })
        .bind("after_open.jstree", (e: any, current: any) => {
            $(".tree-score", $(`#${current.node.id}`)).remove();
            current.node.children.forEach((id: string) => {
                fetchJSON("/deck/stat", {deck: uuidToDeck[id]}).then((stat) => {
                    $(`#${id}`).append(`
                    <div class="tree-score float-right">
                        <span class="tree-new">${stat.new}</span>
                        &nbsp;
                        <span class="tree-leech">${stat.leech}</span>
                        &nbsp;
                        <span class="tree-due">${stat.due}</span>
                    </div>
                    `);
                });
            });
        })
        .bind("after_close.jstree", (e: any, current: any) => {
            const id = current.node.id;

            fetchJSON("/deck/stat", {deck: uuidToDeck[id]}).then((stat) => {
                $(`#${id}`).append(`
                <div class="tree-score float-right">
                    <span class="tree-new">${stat.new}</span>
                    &nbsp;
                    <span class="tree-leech">${stat.leech}</span>
                    &nbsp;
                    <span class="tree-due">${stat.due}</span>
                </div>
                `);
            });
        });
    });
})();

function recurseParseData(data: any[], deck: string[], _depth = 0) {
    let doLoop = true;

    while (_depth < deck.length - 1) {
        for (const c of data) {
            if (c.text === deck[_depth]) {
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
        const id = uuid();

        data.push({
            id,
            text: deck[_depth],
            state: _depth < 2 ? {opened: true} : undefined
        });

        uuidToDeck[id] = deck.join("/");
    }
}
