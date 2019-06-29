export interface IColumn {
    name: string;
    width?: number;
    label: string;
    type?: "string" | "html" | "number" | "datetime" | "tag" | "multiline";
    required?: boolean;
}

export const Columns: IColumn[] = [
    {name: "deck", width: 150, type: "string", required: true, label: "Deck"},
    {name: "front", width: 400, type: "html", required: true, label: "Front"},
    {name: "back", width: 400, type: "html", label: "Back"},
    {name: "mnemonic", width: 300, type: "html", label: "Mnemonic"},
    {name: "tag", width: 150, type: "tag", label: "Tags"},
    {name: "srsLevel", width: 150, type: "number", label: "SRS Level"},
    {name: "nextReview", width: 250, type: "datetime", label: "Next Review"},
    {name: "created", width: 250, type: "datetime", label: "Created"},
    {name: "modified", width: 250, type: "datetime", label: "Modified"}
];

export const DateFormat = "Y-M-d H:i";
