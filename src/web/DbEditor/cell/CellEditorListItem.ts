import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import dbEditorState from "../shared";

@Component
export default class CellEditorListItem extends Vue {
    @Prop() private id!: string;

    private config = dbEditorState.editor.list;

    public render(m: CreateElement) {
        return  m("div", {
            class: ["input-group", "mb-2", "col-12"]
        }, [
            m("div", {
                class: ["input-group-prepend"]
            }, [
                m("button", {
                    ref: `btn-${this.id}`,
                    class: ["input-group-text", "btn", "btn-outline-danger"],
                    attrs: {disabled: !this.config.valueDict[this.id]},
                    on: {click: () => this.$emit("delete")}
                }, "×")
            ]),
            m("input", {
                class: ["form-control"],
                domProps: {value: this.config.valueDict[this.id] || ""},
                on: {input: (e: any) => {
                    this.config.valueDict[this.id] = e.target.value;
                    if (e.target.value) {
                        this.$emit("occupied");
                    }

                    (this.$refs[`btn-${this.id}`] as HTMLButtonElement).disabled = !this.config.valueDict[this.id];
                }}
            })
        ]);
    }
}
