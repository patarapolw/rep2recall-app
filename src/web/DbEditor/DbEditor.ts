import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { CreateElement } from "vue";
import EntryEditor from "./entry/EntryEditor";
import CellEditorMd from "./cell/CellEditorMd";
import CellEditorText from "./cell/CellEditorText";
import CellEditorList from "./cell/CellEditorList";
import DbEditorTr from "./DbEditorTr";
import { fetchJSON } from "../util";
import $ from "jquery";
import { resizableGrid } from "./plugin/tableResize";
import { IColumn } from ".";
import dbEditorState from "./shared";
// @ts-ignore
import smalltalk from "smalltalk";

@Component
export default class DbEditor extends Vue {
    @Prop() private cols!: IColumn[];
    @Prop() private sortBy!: string;
    @Prop() private editorApi!: string;

    private desc: boolean = false;
    private data: any[] = [];
    private offset = 0;
    private limit = 10;
    private q = "";
    private entryEditorTitle = "Add new entry";
    private isLoading = false;

    private counter = dbEditorState.counter;
    private searchBar = dbEditorState.searchBar;
    private editor = {} as any;

    constructor(props: any) {
        super(props);
        document.addEventListener("click", () => {
            if ($(".cell-editor-text.can-remove:not(:hover)").length > 0) {
                (this.$refs.editorText as any).hide();
            }
        });
        this.counter.isActive = true;
        this.counter.page.offset = 0;
        this.counter.canAddEntry = true;
        this.searchBar.isActive = true;
        this.searchBar.q = "";
    }

    public render(m: CreateElement) {
        return m("div", {
            style: {"overflow-x": "scroll"}
        }, [
            m(EntryEditor, {
                ref: "entryEditor",
                props: {
                    title: this.entryEditorTitle,
                    cols: this.cols,
                    editorApi: this.editorApi
                },
                on: {save: this.addEntry}
            }),
            m(CellEditorText, {ref: "editorText", on: {hide: this.updateCell}}),
            m(CellEditorList, {ref: "editorList", on: {save: this.updateCell}}),
            m(CellEditorMd, {ref: "editorMd", on: {save: this.updateCell}}),
            m("table", {
                class: ["table", "table-striped"]
            }, [
                m("thead", [
                    m("tr", [
                        ...this.cols.map((col) => {
                            return m("th", {
                                attrs: {scope: "col"},
                                style: {width: `${col.width}px`},
                                on: {click: (e: any) => {
                                    if (e.target.className.indexOf("resizer") !== -1) {
                                        return;
                                    }

                                    if (this.sortBy === col.name) {
                                        this.desc = !this.desc;
                                    } else {
                                        this.sortBy = col.name;
                                        this.desc = false;
                                    }
                                    this.fetchData();
                                }}
                            }, `${col.name} ${this.sortBy === col.name
                                ? this.desc ? "▲" : "▼" : ""}`);
                        }),
                        m("th", {
                            attrs: {scope: "col"},
                            style: {width: "50px !important"}
                        })
                    ])
                ]),
                m("tbody", [
                    m("img", {
                        domProps: {src: "/asset/Spinner-1s-200px.svg"},
                        style: {height: "5em", display: this.isLoading ? "block" : "none"}
                    }),
                    ...this.data.map((d) => m(DbEditorTr, {
                        ref: `row${d.id}`,
                        props: {data: d, editorApi: this.editorApi, cols: this.cols, editor: this.editor},
                        on: {remove: this.removeEntry, edit: this.editEntry}
                    }))
                ])
            ])
        ]);
    }

    public mounted() {
        Vue.set(this.editor, "text", this.$refs.editorText);
        Vue.set(this.editor, "list", this.$refs.editorList);
        Vue.set(this.editor, "md", this.$refs.editorMd);

        resizableGrid($("table")[0]);
        this.fetchData();
    }

    @Watch("counter.page.offset")
    public watchOffset(offset: number) {
        this.offset = offset;
        this.fetchData();
    }

    @Watch("counter.addEntry")
    public watchAddEntry(clicked: boolean) {
        if (clicked) {
            this.entryEditorTitle = "Add new entry";
            (this.$refs.entryEditor as any).show();
        }
    }

    public editEntry(id: number) {
        this.entryEditorTitle = "Edit entry";
        (this.$refs.entryEditor as any).show(id);
    }

    @Watch("searchBar.q")
    public watchQ(q: string) {
        this.q = q;
        this.fetchData();
    }

    public beforeUpdate() {
        if (this.data.length === 0) {
            this.fetchData();
        }
    }

    public updated() {
        resizableGrid($("table")[0]);
    }

    private async fetchData() {
        this.isLoading = true;

        const r = await fetchJSON(this.editorApi, {q: this.q, offset: this.offset, limit: this.limit,
            sortBy: this.sortBy, desc: this.desc});

        this.data = r.data;
        this.counter.page.count = r.count;

        this.isLoading = false;
    }

    private async updateCell({id, colName, value}: any) {
        if (id) {
            const r = await fetchJSON(this.editorApi, {id, fieldName: colName, fieldData: value}, "PUT");

            if (r === 201) {
                this.data.forEach((d, i) => {
                    if (d.id === id) {
                        this.data[i][colName] = value;
                    }
                });
            }
        }
    }

    private async addEntry(entry: any) {
        const r = await fetchJSON(this.editorApi, {create: entry}, "PUT");
        entry.id = r.id;

        dbEditorState.counter.page.count++;
        this.data.splice(0, 0, entry);

        if (this.data.length > 10) {
            this.data = this.data.slice(0, 10);
        }
    }

    private removeEntry(id: number) {
        smalltalk.confirm("", "Are you sure you want to remove this row?").then(() => {
            fetchJSON(this.editorApi, {id}, "DELETE").then(() => {
                this.data.forEach((d, i) => {
                    if (d.id === id) {
                        this.data.splice(i, 1);
                    }
                });
            });
        });
    }
}
