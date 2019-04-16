import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import { IColumn } from "..";
import { toTitle } from "../../util";

@Component
export default class EETag extends Vue {
    @Prop() private col!: IColumn;
    @Prop() private value!: string[];

    public render(m: CreateElement) {
        this.value = this.value || [];

        return m("div", {
            class: ["form-group", "row"]
        }, [
            m("label", {
                class: ["col-sm-2", "col-form-label"]
            }, this.col.label || toTitle(this.col.name)),
            m("div", {
                class: ["input-group", "col-lg-10"]
            }, [
                m("input", {
                    class: ["form-control"],
                    domProps: {
                        value: this.value.join(this.col.separator || " "),
                        name: this.col.name,
                        required: this.col.required,
                        placeholder: "Please type in tags separated by spaces"
                    },
                    on: {
                        input: (e: any) => this.onInput(e.target.value.split(this.col.separator || " "))
                    }
                }),
                m("div", {
                    class: ["input-group-append"]
                }, [
                    m("button", {
                        class: ["input-group-text", "btn", "btn-outline-success"],
                        domProps: {disabled: this.value.indexOf("marked") !== -1},
                        on: {click: () => this.value.push("marked")}
                    }, "marked")
                ])
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
