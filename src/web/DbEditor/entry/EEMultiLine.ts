import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import { IColumn } from "..";
import { toTitle } from "../../util";

@Component
export default class EEMultiLine extends Vue {
    @Prop() private col!: IColumn;
    @Prop() private value?: string;
    @Prop() private readonly?: boolean;

    public render(m: CreateElement) {
        return m("div", {
            class: ["form-group", "row"]
        }, [
            m("label", {
                class: ["col-sm-2", "col-form-label"]
            }, this.col.label || toTitle(this.col.name)),
            m("div", {
                class: ["input-group", "col-lg-10"]
            }, [
                m("textarea", {
                    class: ["form-control"],
                    attrs: {
                        readonly: this.readonly
                    },
                    domProps: {
                        value: this.value,
                        name: this.col.name,
                        required: this.col.required
                    },
                    on: {input: (e: any) => this.onInput(e.target.value || null)}
                })
            ]),
            this.col.required
            ? m("div", {
                class: ["invalid-feedback"]
            }, `${toTitle(this.col.name)} is required.`)
            : undefined
        ]);
    }

    @Emit("input")
    private onInput(v: string) {
        return v;
    }
}
