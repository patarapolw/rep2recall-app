import { Vue, Component, Watch } from "vue-property-decorator";
import h from "hyperscript";
import TreeviewItem, { ITreeViewItem } from "./quiz/TreeviewItem";
import { fetchJSON } from "./util";

@Component({
    components: { TreeviewItem },
    template: h(".container.mt-3", [
        h(".input-group", [
            h("input.form-control", {
                placeholder: "Type here to search"
            }, "{{ q }}"),
            h(".input-group-append", [
                h("button.btn.btn-outline-success", "Search")
            ])
        ]),
        h(".treeview", [
            h("img", {
                src: "Spinner-1s-200px.svg",
                attrs: {
                    ":style": "{display: isLoading ? 'block' : 'none'}"
                }
            }),
            h("ul", [
                h("treeview-item", {attrs: {
                    "v-for": "c in data",
                    ":key": "c.fullName",
                    ":data": "c",
                    ":q": "q",
                    ":parent-is-open": "true"
                }})
            ])
        ])
    ]).outerHTML
})
export default class QuizUi extends Vue {
    private isLoading = true;
    private data: ITreeViewItem[] = [];
    private q = ""

    public mounted() {
        this.getTreeViewData();
    }

    @Watch("q")
    public watchQ() {
        this.getTreeViewData();
    }

    private async getTreeViewData() {
        this.isLoading = true;
        this.data = await fetchJSON("/api/quiz/treeview", {q: this.q});
        this.isLoading = false;
    }
}
