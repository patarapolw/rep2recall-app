import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import dbEditorState from "../shared";

@Component
export default class SearchBar extends Vue {
    private state = dbEditorState.searchBar;

    public render(m: CreateElement) {
        return m("input", {
            ref: "searchBar",
            class: ["form-control", "mr-sm-2"],
            style: {minWidth: "400px", display: this.state.isActive ? "inline-block" : "none"},
            domProps: {placeholder: "Type here to search", autocomplete: false},
            on: {keypress: (e: any) => {
                if (e.key === "Enter") {
                    this.onChange(e.target.value || "");
                }
            }}
        });
    }

    public mounted() {
        this.state.instance = this.$refs.searchBar;
    }

    @Emit("change")
    public onChange(q: string) {
        this.state.q = q;
        return q;
    }
}
