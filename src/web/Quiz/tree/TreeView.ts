import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { CreateElement } from "vue";
import { fetchJSON } from "../../util";
import globalState from "../../shared";
import "./TreeView.scss";
import "@fortawesome/fontawesome-free/css/all.css";
import TreeViewItem, { ITreeViewItem } from "./TreeViewItem";

@Component
export default class TreeView extends Vue {
    @Prop() private q!: string;

    private data: ITreeViewItem[] = [];

    public render(m: CreateElement) {
        return m("div", {
            class: ["tree-view"]
        }, [
            m("ul", this.data.map((c) => {
                return m(TreeViewItem, {props: {data: c, q: this.q, parentIsOpen: true}});
            }))
        ]);
    }

    public mounted() {
        this.getTreeViewData();
    }

    @Watch("q")
    public watchQ() {
        this.getTreeViewData();
    }

    private async getTreeViewData() {
        this.data = await fetchJSON(globalState.deckApi + "treeview", {q: this.q});
    }
}
