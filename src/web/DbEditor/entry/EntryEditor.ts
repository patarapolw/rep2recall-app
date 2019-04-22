import { toTitle, fetchJSON } from "../../util";
import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import MarkdownEditor from "./MarkdownEditor";
import $ from "jquery";
import { IColumn } from "..";
import globalState from "../../shared";
import EEOneLine from "./EEOneLine";
import EETag from "./EETag";
import EEDatetime from "./EEDatetime";
import EEMultiLine from "./EEMultiLine";

@Component
export default class EntryEditor extends Vue {
    @Prop() private title: string = "Edit entry";
    @Prop() private showAll = false;
    @Prop() private cols!: IColumn[];
    @Prop() private editorApi!: string;

    private entry: any = {};
    private wasValidated = false;

    constructor(props: any) {
        super(props);
        $(document.body).on("mouseover", ".modal", () => {
            const $modal = $(".modal");
            if ($("textarea:hover, .scroll:hover", $modal).length > 0) {
                $modal.css("pointer-events", "none");
            } else {
                $modal.css("pointer-events", "auto");
            }
        });
    }

    public render(m: CreateElement) {
        const formContent: any[] = [];

        for (const col of this.cols) {
            if (!this.showAll && typeof col.newEntry === "boolean" && !this.entry.id) {
                continue;
            }

            const v = this.entry[col.name];

            switch (col.type) {
                case "datetime":
                    formContent.push(m(EEDatetime, {
                        props: {col, value: this.entry[col.name] || ""},
                        on: {input: (_v: string) => Vue.set(this.entry, col.name, _v)}
                    }));
                    break;
                case "markdown":
                    formContent.push(m("div", {
                        class: ["form-group"]
                    }, [
                        m("label", col.label || toTitle(col.name)),
                        m(MarkdownEditor, {
                            props: {
                                value: this.entry[col.name] || "",
                                required: col.required
                            },
                            on: {input: (_v: string) => this.entry[col.name] = _v}
                        }),
                        col.required
                        ? m("div", {
                            class: ["invalid-feedback"]
                        }, `${toTitle(col.name)} is required.`)
                        : undefined
                    ]));
                    break;
                case "one-line":
                case "list":
                case "number":
                    if (col.name === "template") {
                        formContent.push(m(EEOneLine, {
                            props: {col, value: this.entry[col.name] || ""},
                            on: {input: (_v: string) => {
                                Vue.set(this.entry, col.name, _v);
                                if (_v) {
                                    fetchJSON(globalState.templateApi, {template: _v}).then((t) => {
                                        if (t) {
                                            for (const col2 of this.cols) {
                                                if (t[col2.name]) {
                                                    this.entry = Object.assign(this.entry, {
                                                        [col2.name]: t[col2.name]
                                                    });
                                                }
                                            }
                                        }
                                    });
                                }
                            }}
                        }));
                    } else if (col.name === "tag") {
                        formContent.push(m(EETag, {
                            props: {col, value: this.entry[col.name] || ""},
                            on: {input: (_v: string) => Vue.set(this.entry, col.name, _v)}
                        }));
                    } else {
                        formContent.push(m(EEOneLine, {
                            props: {col, value: this.entry[col.name] || ""},
                            on: {input: (_v: string) => Vue.set(this.entry, col.name, _v)}
                        }));
                    }
                    break;
                case "multi-line":
                default:
                    formContent.push(m(EEMultiLine, {
                        props: {col, value: this.entry[col.name] || ""},
                        on: {input: (_v: string) => Vue.set(this.entry, col.name, _v)}
                    }));
            }
        }

        if (this.entry.data) {
            console.log(this.entry);

            formContent.push(m("h4", "Template data"));

            for (const k of ["model", "template", "entry"]) {
                const col = {name: k};
                formContent.push(m(EEOneLine, {
                    props: {col, value: this.entry[col.name] || "", readonly: true},
                    on: {input: (_v: string) => Vue.set(this.entry, col.name, _v)}
                }));
            }

            for (const k of Object.keys(this.entry.data)) {
                const col = {name: k};
                formContent.push(m(EEMultiLine, {
                    props: {col, value: this.entry.data[col.name] || "", readonly: true},
                    on: {input: (_v: string) => Vue.set(this.entry.data, col.name, _v)}
                }));
            }
        }

        return m("b-modal", {
            ref: "entryEditor",
            props: {size: "lg"},
            attrs: {"title": this.title, "hide-footer": true}
        }, [
            m("form", {
                class: {
                    "was-validated": this.wasValidated,
                    "ml-3": true,
                    "mr-3": true,
                    "needs-validation": true
                }
            }, formContent),
            m("b-button", {
                on: {click: () => {
                    for (const col of this.cols) {
                        if (col.required) {
                            if (!this.entry[col.name]) {
                                this.wasValidated = true;
                                return;
                            }
                        }
                    }

                    const entry = {} as any;
                    for (const col of this.cols) {
                        let v = this.entry[col.name];
                        if (v && col.type === "list") {
                            v = v.filter((el: string, i: number) => el && v.indexOf(el) === i).sort();
                        } else if (v && col.type === "number") {
                            v = parseFloat(v);
                        }

                        entry[col.name] = v;
                    }

                    this.onSave(entry);
                    (this.$refs.entryEditor as any).hide();
                }}
            }, "Save")
        ]);
    }

    public async show(id?: number) {
        this.wasValidated = false;
        if (id) {
            const r = await fetchJSON(this.editorApi + "findOne", {id});
            this.entry = r;

            console.log(r);
        } else {
            this.entry = {};
        }
        (this.$refs.entryEditor as any).show();
    }

    @Emit("save")
    public onSave(entry: any) {
        return entry;
    }
}
