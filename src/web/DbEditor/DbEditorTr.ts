import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import uuid from "uuid/v4";
import { md2html, fetchJSON } from "../util";
import DatetimeNullable from "./entry/DatetimeNullable";
import { IColumn } from ".";

@Component
export default class CardEditorTr extends Vue {
    @Prop() private data!: any;
    @Prop() private editorApi!: any;
    @Prop() private cols!: IColumn[];
    @Prop() private editor!: any;

    public render(m: CreateElement) {
        const tds = this.cols.map((col) => {
            const v = this.data[col.name];
            let inner;
            let onclick = (e: any) => {};
            const tdRef = uuid();

            if (col.type === "datetime") {
                inner = m(DatetimeNullable, {
                    props: {value: this.data[col.name] || ""},
                    style: {width: "200px"},
                    on: {input: (_v: string | null) => {
                        fetchJSON(this.editorApi, {id: this.data.id, fieldName: "nextReview", fieldData: _v}, "PUT")
                        .then(() => {
                            Vue.set(this.data, "nextReview", _v);
                        });
                    }}
                });
            } else if (col.type === "markdown") {
                inner = m("div", {
                    class: ["cell-wrapper"],
                    domProps: {innerHTML: md2html(this.data[col.name] || "")}
                });

                onclick = () => this.editor.md.show(this.data.id, col.name, v);
            } else if (col.type === "list") {
                inner = m("div", {
                    class: ["cell-wrapper"]
                }, v ? v.join("\n") : "");

                onclick = () => {
                    this.editor.list.show(this.data.id, col.name, v);
                };
            } else if (col.type === "multi-line") {
                inner = m("pre", {
                    class: ["cell-wrapper"]
                }, v);

                onclick = () => {
                    const $dom = $(this.$refs[tdRef]);
                    this.editor.text.show(this.data.id, col.name, v,  {
                        offset: $dom.offset(),
                        height: $dom.height(),
                        width: $dom.width()
                    });
                };
            } else {
                inner = m("div", {
                    class: ["cell-wrapper"]
                }, v);

                onclick = () => {
                    const $dom = $(this.$refs[tdRef]);
                    this.editor.text.show(this.data.id, col.name, v,  {
                        offset: $dom.offset(),
                        height: $dom.height(),
                        width: $dom.width()
                    });
                };
            }

            return m("td", {
                ref: tdRef,
                on: {click: onclick}
            }, [
                inner
            ]);
        });

        tds.push(m("td", [
            m("button", {
                class: ["btn"],
                style: {cursor: "pointer"},
                on: {click: () => this.onEdit(this.data.id)}
            }, "✎"),
            m("button", {
                class: ["btn"],
                style: {cursor: "pointer"},
                on: {click: () => this.onRemove(this.data.id)}
            }, "✘")
        ]));

        return m("tr", tds);
    }

    @Emit("remove")
    public onRemove(id: number) {
        return id;
    }

    @Emit("edit")
    public onEdit(id: number) {
        return id;
    }
}
