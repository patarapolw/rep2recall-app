import { Vue, Component, Prop } from "vue-property-decorator";
import h from "hyperscript";
import { Columns } from "../shared";
import DatetimeNullable from "./DatetimeNullable";
import { makeCamelSpaced, fetchJSON, normalizeArray, html2md } from "../util";

@Component({
    components: {DatetimeNullable},
    template: h("b-modal", {attrs: {
        ":id": "id",
        ":title": "title",
        ":size": "size",
        "v-on:show": "onModalShown"
    }}, [
        h("form.col-12", [
            h(".col-12.mb-3", {attrs: {
                "v-for": "c in cols",
                ":key": "c.name"
            }}, [
                h(".row", [
                    h("label.col-form-label.mb-1", {attrs: {
                        ":class": "{'col-sm-2': (['string', 'number', 'list', 'datetime'].indexOf(c.type) !== -1)}"
                    }}, "{{ c.label || makeCamelSpaced(c.name) }}"),
                    h(".col-12", {attrs: {
                        "v-if": "c.type === 'html'"
                    }}, [
                        h("markdown-editor", {attrs: {
                            ":ref": "c.name",
                            ":configs": "{spellChecker: false}"
                        }})
                    ]),
                    h("datetime-nullable.col-sm-10", {attrs: {
                        "v-else-if": "c.type === 'datetime'",
                        ":value": "data[c.name]"
                    }}),
                    h("input.form-control.col-sm-10", {attrs: {
                        "v-else": "",
                        ":value": "data[c.name]"
                    }})
                ])
            ])
        ])
    ]).outerHTML
})
export default class EntryEditor extends Vue {
    @Prop() id!: string;
    @Prop() entryId?: number;
    @Prop() title!: string;
    
    private data: any = {};

    private readonly size = "lg";
    private readonly cols = Columns;
    private readonly makeCamelSpaced = makeCamelSpaced
    
    private onModalShown() {
        if (this.entryId) {
            fetchJSON("/api/editor/findOne", {id: this.entryId}).then((data) => {
                Vue.set(this, "data", data)
                this.cols.forEach((c) => {
                    if (c.type === "html") {
                        const mde = normalizeArray(this.$refs[c.name]).simplemde;
                        mde.value(html2md(data[c.name] || ""));
                    }
                })
            });
        }
    }
}
