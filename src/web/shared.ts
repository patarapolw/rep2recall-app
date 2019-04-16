import { IColumn } from "./DbEditor";

export const globalState = {
    deckApi: "/deck/",
    quizApi: "/quiz/",
    templateApi: "/template/",
    cardEditorApi: "/card/editor/",
    cols: [
        {name: "deck", width: 150, type: "one-line", required: true},
        {name: "template", width: 150, type: "one-line"},
        {name: "front", width: 400, type: "markdown", required: true},
        {name: "back", width: 400, type: "markdown"},
        {name: "tag", width: 150, type: "list", separator: " "},
        {name: "note", width: 300, type: "markdown"},
        {name: "srsLevel", width: 150, type: "number", label: "SRS Level", newEntry: false},
        {name: "nextReview", width: 200, type: "datetime", label: "Next Review", newEntry: false}
    ] as IColumn[],
    dateFormat: "Y-M-d H:i",
    entryEditor: {} as any
};

export default globalState;
