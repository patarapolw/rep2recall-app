import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import uuid from "uuid/v4";
import flatpickr from "flatpickr";
import moment from "moment";

@Component
export default class DatetimeNullable extends Vue {
    @Prop() private value!: string | null;

    private dateFormat = "M d, Y H:i";
    private inputRef = uuid();
    private _flatpickr?: flatpickr.Instance;

    public render(m: CreateElement) {
        return m("div", {
            class: ["input-group"]
        }, [
            m("input", {
                ref: this.inputRef,
                class: ["form-control"],
                domProps: {value: this.value ? flatpickr.formatDate(moment(this.value).toDate(), this.dateFormat) : undefined}
            }),
            m("div", {
                class: ["input-group-append"]
            }, [
                m("button", {
                    class: ["input-group-text", "btn", "btn-outline-danger"],
                    domProps: {disabled: !this.value},
                    on: {click: () => {
                        this.value = null;
                        this.onInput(null);
                    }}
                }, "×")
            ])
        ]);
    }

    @Emit("input")
    public onInput(v: string | null) {
        return v;
    }

    public initFlatpickr() {
        this._flatpickr = flatpickr(this.$refs[this.inputRef] as HTMLInputElement, {
            enableTime: true,
            defaultDate: this.value || "",
            dateFormat: this.dateFormat,
            onClose: (dates) => {
                if (dates.length > 0) {
                    this.onInput(dates[0].toISOString());
                }
            }
        });

        if (Array.isArray(this._flatpickr)) {
            this._flatpickr = this._flatpickr[0];
        }
    }

    public updated() {
        if (!this._flatpickr) {
            this.initFlatpickr();
        }

        if (this._flatpickr) {
            this._flatpickr!.setDate(this.value || "");
        }
    }
}
