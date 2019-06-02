import { Vue, Component } from "vue-property-decorator";
import h from "hyperscript";

@Component({
    template: h(".stretched", [
        h(".editor-control", [
            h("button.btn", "<<"),
            h("button.btn", "<"),
            h("span", "0-0 of 0"),
            h("button.btn", ">"),
            h("button.btn", ">>"),
            h(".editor-input", [
                h("input.form-control", {
                    placeholder: "Type here to search"
                })
            ])
        ]),
        h("table")
    ]).outerHTML
})
export default class EditorUi extends Vue {}
