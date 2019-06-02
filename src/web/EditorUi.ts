import { Vue, Component, Watch } from "vue-property-decorator";
import h from "hyperscript";
import { Columns } from "./shared";
import { makeCamelSpaced, fetchJSON } from "./util";
import DatetimeNullable from "./editor/DatetimeNullable";

@Component({
    components: {DatetimeNullable},
    template: h(".stretched.editor-window", [
        h(".editor-control", [
            h("button.btn", {attrs: {
                "v-on:click": "offset = 0"
            }}, "<<"),
            h("button.btn", {attrs: {
                "v-on:click": "offset -= limit"
            }}, "<"),
            h("span", "{{editorLabel}}"),
            h("button.btn", {attrs: {
                "v-on:click": "offset += limit"
            }}, ">"),
            h("button.btn", {attrs: {
                "v-on:click": "offset = NaN"
            }}, ">>"),
            h("div", {attrs: {
                "v-if": "checkedIds.size > 0"
            }}, [
                h("button.btn.btn-outline-success.editor-button", {attrs: {
                    "v-if": "checkedIds.size === 1"
                }}, "Edit"),
                h("button.btn.btn-outline-secondary.mr-3", "Change Deck"),
                h("button.btn.btn-outline-danger.editor-button", "Delete"),
            ]),
            h(".editor-input", [
                h("input.form-control", {
                    placeholder: "Type here to search",
                    attrs: {
                        ":value": "q",
                        "v-on:keyup": "onSearchbarKeypress"
                    }
                })
            ])
        ]),
        h("table.table.table-hover", {attrs: {
            ":style": "{width: tableWidth + 'px'}"
        }}, [
            h("colgroup", [
                h("col", {attrs: {
                    ":style": "{width: colWidths.checkbox + 'px'}",
                }}),
                h("col", {attrs: {
                    "v-for": "c in cols",
                    ":style": "{width: c.width + 'px'}",
                    ":key": "c.name"
                }}),
                h("col", {attrs: {
                    "v-for": "c in extraCols",
                    ":style": "{width: colWidths.extra + 'px'}",
                    ":key": "'data.' + c"
                }})
            ]),
            h("thead", [
                h("tr", [
                    h("th", [
                        h("div", [
                            h("input", {type: "checkbox", attrs: {
                                "v-on:click": "onCheckboxClicked($event)",
                                "ref": "checkbox.main",
                                ":checked": "checkedIds.size > 0"
                            }})
                        ])
                    ]),
                    h("th", {attrs: {
                        "v-for": "c in cols",
                        ":key": "c.name",
                        "scope": "col"
                    }}, "{{ c.label || makeCamelSpaced(c.name) }}"),
                    h("th", {attrs: {
                        "v-for": "c in extraCols",
                        ":key": "'data.' + c",
                        "scope": "col"
                    }}, "{{c}}")
                ])
            ]),
            h("tbody", [
                h("tr.fixed-header-offset"),
                h("tr", {attrs: {
                    "v-for": "d in data",
                    ":key": "d.id"
                }}, [
                    h("td", {style: {width: "50px"}}, [
                        h("div", [
                            h("input", {type: "checkbox", attrs: {
                                "v-on:click": "onCheckboxClicked($event, d.id)",
                                ":checked": "checkedIds.has(d.id)"
                            }})
                        ])
                    ]),
                    h("td", {attrs: {
                        "v-for": "a in getOrderedDict(d)",
                        ":key": "a[0]",
                    }}, [
                        h("iframe.html-frame", {attrs: {
                            "v-if": "a[2].type === 'html'",
                            ":srcdoc": "a[1]",
                            "height": "150",
                            "width": "350",
                            "frameBorder": "0"
                        }}),
                        h("datetime-nullable", {attrs: {
                            "v-else-if": "a[2].type === 'datetime'",
                            ":value": "a[1]",
                            "width": "220"
                        }}),
                        h(".wrapper", {attrs: {
                            "v-else": "",
                        }}, [
                            h(".wrapped", "{{a[2].type === 'list' ? a[1].join('\\n') : a[1]}}")
                        ])
                    ]),
                    h("td", {attrs: {
                        "v-for": "c in extraCols",
                        ":key": "'data.' + c"
                    }}, [
                        h(".wrapper", {attrs: {
                            ":style": "{width: (colWidths.extra - 20) + 'px'}"
                        }}, [
                            h(".wrapped", "{{d.data[c]}}")
                        ])
                    ])
                ])
            ])
        ])
    ]).outerHTML
})
export default class EditorUi extends Vue {
    private cols = Columns;
    private extraCols: string[] = [];
    private q = "";
    private offset = 0;
    private limit = 10;
    private count = 0;
    private sortBy = "deck";
    private desc = false;
    private data: any[] = [];
    private canFetch = true;
    private checkedIds: Set<number> = new Set();

    private readonly colWidths = {
        checkbox: 50,
        extra: 250
    }

    private makeCamelSpaced = makeCamelSpaced;

    public mounted() {
        this.fetchData();
    }

    public updated() {
        if (this.canFetch) {
            this.fetchData();
        }
    }

    get editorLabel() {
        const from = this.count === 0 ? 0 : this.offset + 1;
        let to = this.offset + this.data.length;
        if (to < from) {
            to = from;
        }

        return `${from}-${to} of ${this.count}`;
    }

    get tableWidth(): number {
        return (
            this.colWidths.checkbox +
            this.cols.map((c) => c.width).reduce((a, v) => a + v) 
            + (this.extraCols.length * this.colWidths.extra)) + 150
    }

    private getOrderedDict(d: any): any[][] {
        const output: any[][] = [];
        this.cols.forEach((c) => {
            output.push([c.name, d[c.name], c]);
        });

        return output;
    }

    private onSearchbarKeypress(evt: any) {
        if (evt.key === "Enter") {
            this.fetchData();
        } else {
            this.q = evt.target.value;
        }
    }

    private onCheckboxClicked(evt: any, id?: number) {
        const checkboxMain = this.$refs["checkbox.main"] as HTMLInputElement;

        if (id) {
            const checkboxCurrent = evt.target as HTMLInputElement;
            if (checkboxCurrent.checked) {
                this.checkedIds.add(id);
            } else {
                this.checkedIds.delete(id);
            }
            checkboxMain.indeterminate = this.checkedIds.size > 0 && this.checkedIds.size < this.data.length;
        } else {
            checkboxMain.indeterminate = false;
            if (checkboxMain.checked) {
                this.data.forEach((d) => {
                    this.checkedIds.add(d.id);
                });
            } else {
                this.checkedIds.clear();
            }
        }

        this.$forceUpdate();
    }

    @Watch("offset")
    private async fetchData() {
        this.canFetch = false;

        if (isNaN(this.offset)) {
            this.offset = this.count - this.limit;
        } else if (this.offset < 0) {
            this.offset = 0;
        }

        const r = await fetchJSON("/api/editor/", {q: this.q, offset: this.offset, limit: this.limit, 
            sortBy: this.sortBy, desc: this.desc});

        this.data = r.data;
        this.count = r.count;

        const checkboxMain = this.$refs["checkbox.main"] as HTMLInputElement;
        checkboxMain.indeterminate = false;
        this.checkedIds.clear();

        this.extraCols = [];
        for (const d of this.data) {
            if (d.data) {
                for (const k of Object.keys(d.data)) {
                    if (this.extraCols.indexOf(k) === -1) {
                        this.extraCols.push(k);
                    }
                }
            }
        }
    }
}
