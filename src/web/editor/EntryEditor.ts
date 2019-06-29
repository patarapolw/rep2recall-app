import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import h from "hyperscript";
import { Columns } from "../shared";
import DatetimeNullable from "./DatetimeNullable";
import { fetchJSON, normalizeArray, dotGetter, dotSetter, fixData, IKv, deepMerge } from "../util/util";
import TagEditor from "./TagEditor";
import swal from "sweetalert";
import MarkdownEditor from "./MarkdownEditor";

@Component({
    components: {DatetimeNullable, TagEditor, MarkdownEditor},
    template: h("b-modal", {attrs: {
        ":id": "id",
        ":title": "title",
        "size": "lg",
        "v-on:show": "onModalShown",
        "v-on:ok": "onModalOk"
    }}, [
        h("img.page-loader", {attrs: {
            "src": "Spinner-1s-200px.svg",
            "v-if": "isLoading"
        }}),
        h("form.col-12.needs-validation", {attrs: {
            "ref": "form"
        }}, [
            h(".col-12.mb-3", [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "Deck"),
                    h("input.form-control.col-sm-10", {attrs: {
                        ":value": "update.deck || data.deck",
                        "v-on:input": "$set(update, 'deck', $event.target.value)",
                        "required": ""
                    }}),
                    h(".invalid-feedback", "Deck is required.")
                ])
            ]),
            h(".col-12.mb-3", [
                h(".row", [
                    h("label.col-form-label.mb-1", "Front"),
                    h("markdown-editor", {attrs: {
                        ":value": "update.front || getParsedData('front') || ''",
                        "v-on:input": "$set(update, 'front', $event)",
                        "required": "",
                        "invalid-feedback": "Front is required.",
                        ":data": "deepMerge(data, update)"
                    }})
                ])
            ]),
            h(".col-12.mb-3", [
                h(".row", [
                    h("label.col-form-label.mb-1", "Back"),
                    h("markdown-editor", {attrs: {
                        ":value": "update.back || getParsedData('back') || ''",
                        "v-on:input": "$set(update, 'back', $event)",
                        ":data": "deepMerge(data, update)"
                    }})
                ])
            ]),
            h(".col-12.mb-3", [
                h(".row", [
                    h("label.col-form-label.mb-1", "Mnemonic"),
                    h("markdown-editor", {attrs: {
                        ":value": "update.mnemonic || getParsedData('mnemonic') || ''",
                        "v-on:input": "$set(update, 'mnemonic', $event)",
                        ":data": "deepMerge(data, update)"
                    }})
                ])
            ]),
            h(".col-12.mb-3", [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "Tags"),
                    h("tag-editor.col-sm-10", {attrs: {
                        ":value": "(update.tag || data.tag) ? (update.tag || data.tag).join(' ') : ''",
                        "v-on:input": "$set(update, 'tag', $event.split(' '))"
                    }})
                ])
            ]),
            h(".col-12.mb-3", {attrs: {
                "v-if": "entryId"
            }}, [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "SRS Level"),
                    h("input.form-control.col-sm-10", {attrs: {
                        ":value": "update.srsLevel || data.srsLevel",
                        "v-on:input": "$set(update, 'srsLevel', $event.target.value)"
                    }})
                ])
            ]),
            h(".col-12.mb-3", {attrs: {
                "v-if": "entryId"
            }}, [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "Next Review"),
                    h("datetime-nullable.col-sm-10", {attrs: {
                        ":value": "update.nextReview || data.nextReview",
                        "v-on:input": "$set(update, 'nextReview', $event)"
                    }})
                ])
            ]),
            h(".col-12.mb-3", [
                h("h4.mb-3", "Template data")
            ]),
            h(".col-12.mb-3", {attrs: {
                "v-if": "entryId"
            }}, [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "Source"),
                    h("input.form-control.col-sm-10", {attrs: {
                        ":value": "update.source || data.source",
                        "v-on:input": "$set(update, 'source', $event.target.value)",
                        "readonly": ""
                    }})
                ])
            ]),
            h(".col-12.mb-3", {attrs: {
                "v-if": "entryId"
            }}, [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "Template"),
                    h("input.form-control.col-sm-10", {attrs: {
                        ":value": "update.template || data.template",
                        "v-on:input": "$set(update, 'template', $event.target.value)",
                        "readonly": ""
                    }})
                ])
            ]),
            h(".col-12.mb-3", [
                h(".row", [
                    h(".col-6", [
                        h("b-button.form-control", {attrs: {
                            "variant": "success",
                            "v-b-modal.css-editor": ""
                        }}, "Edit CSS")
                    ]),
                    h(".col-6", [
                        h("b-button.form-control", {attrs: {
                            "variant": "warning",
                            "v-b-modal.js-editor": ""
                        }}, "Edit JavaScript")
                    ])
                ])
            ]),
            h(".col-12.mb-3", {attrs: {
                "v-for": "c in dataCols"
            }}, [
                h(".row", [
                    h("label.col-form-label.col-sm-2", "{{c.label}}"),
                    h("textarea.form-control.col-sm-10", {attrs: {
                        ":value": "dotGetter(update, c.name) || dotGetter(data, c.name)",
                        "v-on:input": "dotSetter(update, c.name, $event.target.value)"
                    }})
                ])
            ]),
            h(".col-12.mb-3", [
                h(".row", [
                    h("input.form-control.col-sm-6.no-border", {attrs: {
                        "v-on:keypress": "onExtraRowInput",
                        "placeholder": "Type here and press Enter to add more keys..."
                    }}),
                ])
            ])
        ]),
        h("b-modal", {attrs: {
            id: "css-editor",
            title: "CSS Editor",
            "v-on:ok": "$set(update, 'css', $refs.css.codemirror.getValue())"
        }}, [
            h("codemirror", {attrs: {
                "ref": "css",
                ":value": "update.css || data.css",
                ":options": "{mode: 'text/css'}"
            }}),
        ]),
        h("b-modal", {attrs: {
            id: "js-editor",
            title: "JavaScript Editor",
            "v-on:ok": "$set(update, 'js', $refs.js.codemirror.getValue())"
        }}, [
            h("codemirror", {attrs: {
                "ref": "js",
                ":value": "update.js || data.js",
                ":options": "{mode: 'text/javascript'}"
            }}),
        ])
    ]).outerHTML
})
export default class EntryEditor extends Vue {
    @Prop() id!: string;
    @Prop() entryId?: number;
    @Prop() title!: string;
    
    private data: any = {};
    private update: any = {};
    private isLoading = false;

    private dotGetter = dotGetter;
    private dotSetter = dotSetter;
    private deepMerge = deepMerge;

    get dataCols() {
        return (this.data.data || []).map((d: IKv) => d.key).map((c: string) => {
            return {
                name: `@${c}`,
                label: c
            }
        });
    }

    private getParsedData(key: string) {
        let v: string = this.data[key] || "";

        if (v.startsWith("@rendered\n")) {
            v = "@template\n" + (this.data[`t${key[0].toLocaleUpperCase() + key.substr(1)}`] || "");
        }

        return v;
    }

    private onExtraRowInput(evt: any) {
        const k = evt.target.value;

        if (evt.key === "Enter") {
            evt.preventDefault();

            if (k) {
                if (!this.data.data) {
                    Vue.set(this.data, "data" , []);
                }
    
                let toAdd = true;
                for (const it of this.data.data) {
                    if (it.key === k) {
                        toAdd = false;
                    }
                }
                if (toAdd) {
                    this.data.data.push({
                        key: k,
                        value: ""
                    });
                }
    
                evt.target.value = "";
            }
        }
    }
    
    private async onModalShown() {
        this.data = {};
        this.update = {};
        this.$nextTick(() => {
            normalizeArray(this.$refs.form).classList.remove("was-validated");
        });

        if (this.entryId) {
            this.isLoading = true;

            const data = await fetchJSON("/api/editor/", {cond: {id: this.entryId}});
            Vue.set(this, "data", fixData(data.data[0]));
        }
        
        this.isLoading = false;
    }

    @Emit("ok")
    private async onModalOk(evt: any) {
        for (const c of Columns) {
            if (c.required) {
                if (this.update[c.name] === undefined && !this.data[c.name]) {
                    normalizeArray(this.$refs.form).classList.add("was-validated");
                    evt.preventDefault();
                    return {};
                }
            }
        }

        if (Object.keys(this.update).length > 0) {
            if (this.entryId) {
                const r = await fetchJSON("/api/editor/", {id: this.entryId, update: this.update}, "PUT");
                if (!r.error) {
                    await swal({
                        text: "Updated",
                        icon: "success"
                    });
                }
            } else {
                const r = await fetchJSON("/api/editor/", {create: this.update}, "PUT");
                if (!r.error) {
                    await swal({
                        text: "Created",
                        icon: "success"
                    });
                }
            }
        }

        return this.update;
    }
}
