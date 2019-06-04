import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import h from "hyperscript";
import flatpickr from "flatpickr";
import { DateFormat } from "../shared";
import { normalizeArray } from "../util";

@Component({
    template: h(".input-group.datetime-nullable", {attrs: {
        ":style": "{width: width + 'px !important'}"
    }}, [
        h("input.form-control", {attrs: {
            "ref": "flatpickr",
            ":value": "formatDate(value)"
        }}),
        h(".input-group-append", [
            h("button.btn.btn-outline-danger.input-group-text", {attrs: {
                ":disabled": "!value",
                "v-on:click": "setDate(null)"
            }}, "×")
        ])
    ]).outerHTML
})
export default class DatetimeNullable extends Vue {
    @Prop() width!: number;
    @Prop() value!: string;
    @Prop() readonly?: boolean;

    private flatpickr?: flatpickr.Instance;

    public mounted() {
        this.flatpickr = normalizeArray(flatpickr(this.$refs.flatpickr as HTMLInputElement, {
            enableTime: true,
            defaultDate: this.value,
            dateFormat: DateFormat,
            clickOpens: !this.readonly,
            onClose: (dates) => {
                if (dates.length > 0) {
                    const d = dates[0].toISOString();
                    this.setDate(d);
                }
            }
        }))
    }

    public setDate(d?: string) {
        if (d) {
            this.flatpickr!.setDate(this.value);
        } else {
            this.flatpickr!.clear();
        }
        this.$emit("input", d);
    }

    public formatDate(d: string) {
        if (d) {
            return flatpickr.formatDate(new Date(d), DateFormat);
        }
        return "";
    }
}
