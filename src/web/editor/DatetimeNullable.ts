import { Vue, Component, Prop } from "vue-property-decorator";
import h from "hyperscript";
import flatpickr from "flatpickr";
import { DateFormat } from "../shared";
import { normalizeArray } from "../util/util";

@Component({
    template: h(".input-group.datetime-nullable", {attrs: {
        ":style": "{width: width + 'px !important'}"
    }}, [
        h("input.form-control", {attrs: {
            "ref": "flatpickr"
        }}),
        h(".input-group-append", [
            h("button.btn.btn-outline-danger.input-group-text", {attrs: {
                ":disabled": "!value",
                "v-on:click": "setDate()"
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
            defaultDate: this.formatDate(this.value),
            dateFormat: DateFormat,
            clickOpens: !this.readonly,
            onClose: (dates) => {
                if (dates.length > 0) {
                    this.setDate(dates[0]);
                }
            }
        }))
    }

    public setDate(d?: Date) {
        if (this.flatpickr) {
            if (d) {
                this.flatpickr.setDate(d);
            } else {
                this.flatpickr.clear();
            }
        }

        this.$emit("input", d ? d.toISOString() : null);
    }

    public formatDate(d: string) {
        const dDate =  d ? new Date(d) : undefined;
        return dDate;
    }
}
