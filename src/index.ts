import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import $ from "jquery";
import "jstree";
import "jstree/dist/themes/default/style.min.css";
import { fetchJSON, shuffle, md2html } from "./renderer/util";
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
        $("#DeckArea").jstree({
            core: {
                data,
                multiple: false
            }
        })
        .bind("loaded.jstree", () => {
            // @ts-ignore
            const jstree = $("#DeckArea").jstree(true);

            Object.keys(uuidToDeck).forEach((id) => {
                const node = jstree.get_node(id);
                if (node.children.length === 0) {
                    nodeAddStat(id);
                }
            });
        })
        .bind("after_open.jstree", (e: any, current: any) => {
            $(".tree-score", $(`#${current.node.id}`)).remove();
            current.node.children.forEach((id: string) => nodeAddStat(id));
        })
        .bind("after_close.jstree", (e: any, current: any) => {
            nodeAddStat(current.node.id);
        })
        .bind("select_node.jstree", (e: any, current: any) => {
            initQuiz(current.node.id);
            $("#App").removeClass("container").addClass("container-fluid");
            $("#DeckArea").removeClass("col-12").addClass("col-3").addClass("border-right");
            setTimeout(() => {
                $("#QuizArea").removeClass("hidden");
            }, 400);
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

function nodeAddStat(id: string) {
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

async function initQuiz(id: string) {
    const deck = uuidToDeck[id];
    const cards = await fetchJSON("/quiz/", {deck});
    const quizAreaEl = document.getElementById("QuizArea") as HTMLDivElement;
    const $quizArea = $(quizAreaEl);

    $quizArea.html(`<div>${cards.length} entries to go...</div>`);
    if (cards.length > 0) {
        shuffle(cards);

        while (cards.length > 0) {
            const cardId = cards.splice(0, 1)[0];
            const c = await fetchJSON("/quiz/render", {id: cardId});
            const guid = uuid();

            $quizArea.append(`
            <div id="c-${guid}">
                <div class="c-all">${md2html(c.front)}</div>
                <div class="c-back">${md2html(c.back || "")}</div>
                <div class="c-btn-list mt-3 mb-3">
                    <button class="btn btn-primary c-front c-btn-show">Show</button>
                    <button class="btn btn-success c-back c-btn-right">Right</button>
                    <button class="btn btn-danger c-back c-btn-wrong">Wrong</button>
                    <button class="btn btn-warning c-back c-btn-skip">Skip</button>
                </div>
            </div>
            `);
            quizAreaEl.scrollTo(0, quizAreaEl.scrollHeight);

            const $parent = $(`#c-${guid}`);
            $(".c-back", $parent).hide();
            $(".c-btn-show", $parent).click(() => {
                $(".c-front", $parent).hide();
                $(".c-back", $parent).show();
                quizAreaEl.scrollTo(0, quizAreaEl.scrollHeight);
            });

            await new Promise((resolve, reject) => {
                $(".c-btn-right", $parent).click(() => {
                    fetchJSON("/quiz/right", {id: cardId}, "PUT");
                    resolve();
                });

                $(".c-btn-wrong", $parent).click(() => {
                    fetchJSON("/quiz/wrong", {id: cardId}, "PUT");
                    resolve();
                });

                $(".c-btn-skip", $parent).click(() => {
                    resolve();
                });
            });

            $(".c-btn-list", $parent).hide();
        }

        $quizArea.append(`<div>All done!</div>`);
    } else {
        const [nextHour, nextDay] = await Promise.all([
            fetchJSON("/quiz/", {
                deck,
                due: [1, "hour"]
            }),
            fetchJSON("/quiz/", {
                deck,
                due: [1, "day"]
            })
        ]);

        $quizArea.append(`
        <div>Pending next hour: ${nextHour.length}</div>
        <div>Pending next day: ${nextDay.length}</div>`);
    }
}
