export interface IColumn {
    name: string;
    width: number;
    readOnly?: boolean;
    label?: string;
    type?: "string" | "html" | "number" | "datetime" | "list";
    newEntry?: boolean;
    editEntry?: boolean;
    separator?: string;
    required?: boolean;
    requiredText?: string;
    parse?: (x: string) => any;
    constraint?: (x: any) => boolean;
}

export const Columns: IColumn[] = [
    {name: "deck", width: 150, type: "string", required: true},
    {name: "template", width: 150, type: "string"},
    {name: "front", width: 400, type: "html", required: true},
    {name: "back", width: 400, type: "html"},
    {name: "tag", width: 150, type: "list", separator: " "},
    {name: "note", width: 300, type: "html"},
    {name: "srsLevel", width: 150, type: "number", label: "SRS Level", newEntry: false},
    {name: "nextReview", width: 350, type: "datetime", label: "Next Review", newEntry: false}
];

export const DateFormat = "Y-M-d H:i";
