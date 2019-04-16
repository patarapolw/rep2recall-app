import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import { md2html } from "../../util";

@Component
export default class MarkdownEditor extends Vue {
    @Prop() private value: string = "";
    @Prop() private required: boolean = false;

    public render(m: CreateElement) {
        return m("div", {
            class: ["mde", "row"],
            style: {width: "100%", height: "100px", overflow: "hidden"}
        }, [
            m("textarea", {
                class: ["mde-textarea", "form-control", "col-6"],
                style: {height: "100%"},
                domProps: {value: this.value, required: this.required},
                on: {input: (e: any) => {
                    this.value = e.target.value;
                    this.onInput(this.value);
                }}
            }),
            m("div", {
                class: ["mde-markdownarea", "col-6", "scroll"],
                style: {height: "100%", display: "block", overflow: "scroll"},
                domProps: {innerHTML: md2html(this.value)}
            })
        ]);
    }

    @Emit("input")
    public onInput(v: string) {
        return v;
    }
}
