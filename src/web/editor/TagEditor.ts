import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import h from "hyperscript";

@Component({
    template: h(".input-group.col-form-label", [
        h("input.form-control", {attrs: {
            ":value": "value",
            "v-on:input": "$emit('input', $event.target.value)",
            "placeholder": "Please input tags separated by spaces"
        }}),
        h(".input-group-append", [
            h("button.btn.input-group-text", {attrs: {
                ":class": "tagSet.has('marked') ? 'btn-warning' : 'btn-success'",
                "v-on:click": "onMarkButtonClicked"
            }}, "{{tagSet.has('marked') ? 'Unmark' : 'Mark'}}")
        ])
    ]).outerHTML
})
export default class TagEditor extends Vue {
    @Prop() value!: string;

    get tagSet() {
        return new Set(this.value.split(" ").filter((v) => v));
    }

    @Emit("input")
    private onMarkButtonClicked() {
        if (this.tagSet.has("marked")) {
            this.tagSet.delete("marked")
        } else {
            this.tagSet.add("marked");
        }
        return Array.from(this.tagSet).filter((v) => v).join(" ");
    }
}
