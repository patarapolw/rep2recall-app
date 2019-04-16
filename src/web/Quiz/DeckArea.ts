import { CreateElement } from "vue";
import { Vue, Component } from "vue-property-decorator";
import quizState from "./shared";
import dbEditorState from "../DbEditor/shared";
import TreeView from "./tree/TreeView";

@Component
export default class DeckArea extends Vue {
    private state = quizState;

    constructor(props: any) {
        super(props);
        dbEditorState.counter.isActive = false;
        dbEditorState.searchBar.isActive = false;
    }

    public render(m: CreateElement) {
        return m("div", {
            class: {
                "col-3": this.state.isQuizShown,
                "border-right": this.state.isQuizShown,
                "col-12": !this.state.isQuizShown,
                "animate": true,
                "fixed-container": true
            },
            style: {
                display: this.state.isDeckHidden ? "none" : "inline-block",
                height: `${window.innerHeight - 60}px`, overflow: "scroll"
            }
        }, [
            m("input", {
                class: ["form-control", "mt-3", "search-bar"],
                domProps: {placeholder: "Type here to search"},
                on: {keypress: (e: any) => {
                    if (e.key === "Enter") {
                        this.state.q = e.target.value;
                    }
                }}
            }),
            m(TreeView, {props: {q: this.state.q}})
        ]);
    }
}
