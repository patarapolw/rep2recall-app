export interface IColumn {
    name: string;
    width: number;
    readOnly?: boolean;
    label?: string;
    type?: "one-line" |  "multi-line" | "markdown" | "number" | "datetime" | "list";
    newEntry?: boolean;
    editEntry?: boolean;
    separator?: string;
    required?: boolean;
    requiredText?: string;
    parse?: (x: string) => any;
    constraint?: (x: any) => boolean;
}

export interface IJqList {
    [key: string]: JQuery;
}

export interface ITdPosition {
    offset: JQuery.Coordinates;
    width: number;
    height: number;
}
