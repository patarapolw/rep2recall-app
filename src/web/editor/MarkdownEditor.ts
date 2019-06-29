import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import h from "hyperscript";
import { quizDataToContent, ankiMustache } from "../util/util";

@Component({
    template: h(".w-100", [
        h(".d-flex.markdown-editor", {attrs: {
            ":class": "required ? 'form-required' : 'form-not-required'"
        }}, [
            h(".col-6", [
                h("codemirror.w-100", {attrs: {
                    ":value": "value",
                    "v-on:input": "onValueChanged($event)",
                    ":options": "{mode: 'text/markdown'}"
                }}),
            ]),
            h(".col-6", [
                h("iframe.preview", {attrs: {
                    ":srcdoc": "html",
                    "frameBorder": "0"
                }})
            ])
        ]),
        h("input.form-control.flatten", {attrs: {
            ":required": "required",
            ":value": "value"
        }}),
        h(".invalid-feedback", "{{ invalidFeedback || '' }}")
    ]).outerHTML
})
export default class MarkdownEditor extends Vue {
    @Prop() required?: boolean;
    @Prop() value: string = "";
    @Prop() invalidFeedback?: string;
    @Prop() data: any;

    private html: string = "";

    get readonlyData() {
        return JSON.parse(JSON.stringify(this.data || {}));
    }

    @Emit("input")
    private onValueChanged(newValue: string) {
        this.html = quizDataToContent(this.readonlyData, null, ankiMustache(newValue, this.readonlyData));
        return newValue;
    }
}
