import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import h from "hyperscript";
import quizState from "./shared";

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
    template: h("li", {attrs: {
        ":style": "{display: isDeleted ? 'none' : 'block'}"
    }}, [
        h("span", [
            h("span.caret", {attrs: {
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
                "v-on:click": "onTreeTextClicked"
            }}, "{{ data.name }}"),
            h(".float-right.text-align-right.tree-score", {attrs: {
                "v-if": "isShownStat"
            }}, [
                h("span.tree-new", "{{ data.stat.new.toLocaleString() }}"),
                h("span.tree-leech", "{{ data.stat.leech.toLocaleString() }}"),
                h("span.tree-due", "{{ data.stat.due.toLocaleString() }}"),
            ])
        ]),
        h("ul", {attrs: {
            "v-if": "data.children",
            ":style": "{ display: isOpen ? 'block' : 'none' }"
        }}, [
            h("treeview-item", {attrs: {
                "v-for": "c in data.children",
                ":key": "c.fullName",
                ":data": "c",
                ":q": "q",
                ":parent-is-open": "isOpen"
            }})
        ])
    ]).outerHTML
})
export default class TreeviewItem extends Vue {
    @Prop() private data!: ITreeViewItem;
    @Prop() private q!: string;
    @Prop() private parentIsOpen!: boolean;

    private isOpen = false;
    private isShownStat = true;
    private isDeleted = false;

    private state = quizState

    constructor(props: any) {
        super(props)
        this.isOpen = this.data.isOpen !== undefined ? this.data.isOpen : this.isOpen;
    }

    public mounted() {
        $(".tree-text", this.$el).first().data({
            deck: this.data.fullName,
            delete: () => this.isDeleted = true
        });
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

    private initQuiz(deckName: string) {
        setTimeout(() => {
            this.state.isQuizReady = true;
            this.readMq();
        }, 400);

        this.state.q = this.q;
        this.state.currentDeck = deckName;
        this.state.isQuizStarted = true;
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

    private onTreeTextClicked() {
        this.state.isQuizShown = true;
        this.initQuiz(this.data.fullName);
    }
}
