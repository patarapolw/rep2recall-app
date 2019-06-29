import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import h from "hyperscript";
import quizState from "./shared";
import { normalizeArray } from "../util/util";

interface ITreeViewStat {
    new: number;
    leech: number;
    due: number;
}

export interface ITreeViewItem {
    name: string;
    fullName: string;
    isOpen: boolean;
    children?: ITreeViewItem[];
    stat: ITreeViewStat;
}

@Component({
    name: "treeview-item",
    template: h("li", {attrs: {
        "v-if": "!isDeleted"
    }}, [
        h("span", [
            h(".caret", {attrs: {
                "v-on:click": "onCaretClicked"
            }}, [
                h("i.fas.fa-chevron-down", {attrs: {
                    "v-if": "data.children && isOpen"
                }}),
                h("i.fas.fa-chevron-right", {attrs: {
                    "v-if": "data.children && !isOpen"
                }})
            ]),
            h("span.tree-text", {attrs: {
                "ref": "tree-text",
                "v-on:click": "startReview()"
            }}, "{{ data.name }}"),
            h(".float-right.text-align-right.tree-score", {attrs: {
                "v-if": "isShownStat"
            }}, [
                h("span.tree-new", "{{ data.stat.new.toLocaleString() }}"),
                h("span.tree-leech", "{{ data.stat.leech.toLocaleString() }}"),
                h("span.tree-due", "{{ data.stat.due.toLocaleString() }}")
            ])
        ]),
        h("ul", {attrs: {
            "v-if": "data.children && isOpen"
        }}, [
            h("treeview-item", {attrs: {
                "v-for": "c in data.children",
                ":key": "c.fullName",
                ":data": "c",
                ":q": "q",
                ":parent-is-open": "isOpen",
                ":on-review": "onReview",
                ":on-delete": "onDelete"
            }})
        ])
    ]).outerHTML
})
export default class TreeviewItem extends Vue {
    @Prop() private data!: ITreeViewItem;
    @Prop() private q!: string;
    @Prop() private parentIsOpen!: boolean;
    @Prop() private onReview!: (deck: string, type?: string) => any;
    @Prop() private onDelete!: (deck: string) => Promise<boolean>;

    private isOpen = false;
    private isShownStat = true;
    private isDeleted = false;

    private state = quizState

    constructor(props: any) {
        super(props)
        this.isOpen = this.data.isOpen !== undefined ? this.data.isOpen : this.isOpen;
    }

    public mounted() {
        $(normalizeArray(this.$refs["tree-text"])).data({
            dueAndNew: () => this.startReview(),
            due: () => this.startReview("due"),
            leech: () => this.startReview("leech"),
            new: () => this.startReview("new"),
            all: () => this.startReview("all"),
            exportDeck: () => {
                location.href = `/api/io/export?deck=${encodeURIComponent(this.data.fullName)}`;
            },
            exportDeckAndReset: () => {
                location.href = `/api/io/export?deck=${encodeURIComponent(this.data.fullName)}&reset=true`;
            },
            delete: async () => {
                if (await this.onDelete(this.data.fullName)) {
                    this.isDeleted = true;
                }
            }
        });
        this.updateStat();
    }

    private async startReview(type?: string) {
        await this.onReview(this.data.fullName, type);
        this.updateStat();
    }

    @Watch("q")
    @Watch("isOpen")
    private updateStat() {
        if (!this.data.children || (this.parentIsOpen && !this.isOpen)) {
            this.isShownStat = true;
        } else {
            this.isShownStat = false;
        }
    }

    private readMq(mq: MediaQueryListEvent | MediaQueryList = this.state.mediaQuery) {
        if (mq.matches && this.state.isQuizShown) {
            this.state.isDeckHidden = true;
        } else {
            this.state.isDeckHidden = false;
        }
    }

    private onCaretClicked() {
        this.isOpen = !this.isOpen;
    }
}
