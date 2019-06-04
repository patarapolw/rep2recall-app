import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import h from "hyperscript";
import flatpickr from "flatpickr";
import { DateFormat } from "../shared";

@Component({
    template: h(".input-group.datetime-nullable", {attrs: {
        ":style": "{width: width + 'px !important'}"
    }}, [
        h("input.form-control", {attrs: {
            "ref": "flatpickr",
            ":value": "value"
        }}),
        h(".input-group-append", [
            h("button.btn.btn-outline-danger.input-group-text", {attrs: {
                ":disabled": "!value",
                "v-on:click": "setNull"
            }}, "×")
        ])
    ]).outerHTML
})
export default class DatetimeNullable extends Vue {
    @Prop() width!: number;

    private value: string = "";
    private flatpickr?: flatpickr.Instance;

    public mounted() {
        this.flatpickr = flatpickr(this.$refs.flatpickr as HTMLInputElement, {
            enableTime: true,
            defaultDate: this.value,
            dateFormat: DateFormat,
            onClose: (dates) => {
                if (dates.length > 0) {
                    this.value = dates[0].toISOString();
                    this.$emit("input", this.value);
                }
            }
        })
    }

    public updated() {
        this.flatpickr!.setDate(this.value);
    }

    public setNull() {
        this.value = "";
        this.flatpickr!.clear();
    }
}
