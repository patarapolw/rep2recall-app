import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import { IColumn } from "..";
import { toTitle } from "../../util";

@Component
export default class EEOneLine extends Vue {
    @Prop() private col!: IColumn;
    @Prop() private value?: string | number | null;
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
                m("input", {
                    class: ["form-control"],
                    attrs: {
                        readonly: this.readonly
                    },
                    domProps: {
                        value: this.value,
                        name: this.col.name,
                        required: this.col.required
                    },
                    on: {
                        input: (e: any) => {
                            if (!e.target.value) {
                                this.onInput(null);
                            } else {
                                if (this.col.type === "number") {
                                    const n = parseInt(e.target.value);
                                    if (!isNaN(n)) {
                                        this.onInput(n);
                                    }
                                } else {
                                    this.onInput(e.target.value);
                                }
                            }
                        },
                        keydown: (e: any) => {
                            if (this.col.type === "number") {
                                const key = e.key;
                                if (!(e.metaKey || e.ctrlKey) && key.length === 1 && !/\d/.test(key)) {
                                    e.preventDefault();
                                }
                            }
                        }
                    }
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
    private onInput(v: string | string[] | number | null) {
        return v;
    }
}
