import { Vue, Component, Prop } from "vue-property-decorator";
import h from "hyperscript";
import flatpickr from "flatpickr";
import { DateFormat } from "../shared";

@Component({
    template: h(".input-group.datetime-nullable", {attrs: {
        ":style": "{width: width + 'px !important'}"
    }}, [
        h("input.form-control", {attrs: {
            "ref": "flatpickr",
            ":value": "value_"
        }}),
        h(".input-group-append", [
            h("button.btn.btn-outline-danger.input-group-text", {attrs: {
                ":disabled": "!value_",
                "v-on:click": "setNull"
            }}, "×")
        ])
    ]).outerHTML
})
export default class DatetimeNullable extends Vue {
    @Prop() value!: string;
    @Prop() width!: number;

    private value_: string = this.value || "";
    private flatpickr?: flatpickr.Instance;

    public mounted() {
        this.flatpickr = flatpickr(this.$refs.flatpickr as HTMLInputElement, {
            enableTime: true,
            defaultDate: this.value,
            dateFormat: DateFormat,
            onClose: (dates) => {
                if (dates.length > 0) {
                    this.value_ = dates[0].toISOString();
                    this.$forceUpdate();
                }
            }
        })
    }

    public updated() {
        this.flatpickr!.setDate(this.value);
    }

    public setNull() {
        this.value_ = "";
        this.flatpickr!.clear();
    }
}
