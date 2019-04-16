import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import { IColumn } from "..";
import { toTitle } from "../../util";
import DatetimeNullable from "./DatetimeNullable";

@Component
export default class EEDatetime extends Vue {
    @Prop() private col!: IColumn;
    @Prop() private value!: string | null;

    public render(m: CreateElement) {
        return m("div", {
            class: ["form-group", "row"]
        }, [
            m("label", {
                class: ["col-sm-2", "col-form-label"]
            }, this.col.label || toTitle(this.col.name)),
            m(DatetimeNullable, {
                class: ["col-10"],
                props: {value: this.value},
                on: {
                    input: (e: any) => this.onInput(e.target.value)
                }
            }),
            this.col.required
            ? m("div", {
                class: ["invalid-feedback"]
            }, `${toTitle(this.col.name)} is required.`)
            : undefined
        ]);
    }

    @Emit("input")
    public onInput(v: string | null) {
        return v;
    }
}
