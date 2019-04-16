import { Vue, Component, Prop, Emit, Watch } from "vue-property-decorator";
import { CreateElement } from "vue";
import dbEditorState from "../shared";

@Component
export default class Counter extends Vue {
    private state = dbEditorState.counter;

    public render(m: CreateElement) {
        const computedPage = {
            from: this.state.page.count > 0 ? this.state.page.offset + 1 : 0,
            to: this.state.page.count > 0
                ? this.state.page.offset + this.state.page.limit > this.state.page.count
                    ? this.state.page.count
                    : this.state.page.offset + this.state.page.limit
                : 0
        };

        const isDisabled = {
            prev: !(computedPage.from > 1),
            next: !(computedPage.to < this.state.page.count)
        };

        return m("ul", {
            ref: "counter",
            class: ["navbar-nav"],
            style: {display: this.state.isActive ? "inline-block" : "none"}
        }, [
            m("li", {
                class: ["nav-item"]
            }, [
                m("div", {
                    class: ["page-control"]
                }, [
                    m("button", {
                        class: ["btn", "d-inline", "mr-1"],
                        domProps: {disabled: isDisabled.prev, type: "button"},
                        on: {click: () => this.onChange(0)}
                    }, "<<"),
                    m("button", {
                        class: ["btn", "d-inline", "mr-1"],
                        domProps: {disabled: isDisabled.prev, type: "button"},
                        on: {click: () => this.onChange(this.state.page.offset - this.state.page.limit)}
                    }, "<"),
                    m("span", {
                        class: ["d-inline", "mr-1"],
                        style: {whiteSpace: "pre"}
                    },
                    `${computedPage.from.toLocaleString()} - ${computedPage.to.toLocaleString()} of ${this.state.page.count.toLocaleString()}`),
                    m("button", {
                        class: ["btn", "d-inline", "mr-1"],
                        domProps: {disabled: isDisabled.next, type: "button"},
                        on: {click: () => this.onChange(this.state.page.offset + this.state.page.limit)}
                    }, ">"),
                    m("button", {
                        class: ["btn", "d-inline"],
                        domProps: {disabled: isDisabled.next, type: "button"},
                        on: {click: () => this.onChange(
                            (Math.ceil(this.state.page.count / this.state.page.limit) - 1) * this.state.page.limit)}
                    }, ">>")
                ])
            ]),
            m("li", {
                class: ["nav-item"]
            }, [
                m("button", {
                    style: {display: this.state.canAddEntry ? "inline-block" : "none"},
                    class: ["btn", "btn-primary", "ml-3", "mr-3", "form-control"],
                    domProps: {type: "button"},
                    on: {click: () => this.addEntry()}
                }, "Add new entry")
            ])
        ]);
    }

    public mounted() {
        this.state.instance = this.$refs.counter;
    }

    public addEntry() {
        this.state.addEntry = true;
        setTimeout(() => this.state.addEntry = false, 100);
    }

    private onChange(offset: number) {
        this.state.page.offset = offset;
    }
}
