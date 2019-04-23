import { Vue, Component, Prop, Watch } from "vue-property-decorator";
import { CreateElement } from "vue";
import quizState from "../shared";

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

@Component
export default class TreeViewItem extends Vue {
    @Prop() private data!: ITreeViewItem;
    @Prop() private q!: string;
    @Prop() private parentIsOpen!: boolean;

    private isOpen: boolean = false;
    private isShownStat: boolean = true;
    private isDeleted = false;

    constructor(props: any) {
        super(props);
        this.isOpen = this.data.isOpen !== undefined ? this.data.isOpen : this.isOpen;
    }

    public render(m: CreateElement) {
        return m("li", {
            style: {display: this.isDeleted ? "none" : "block"}
        }, [
            m("span", [
                m("span", {
                    class: ["caret"],
                    on: {click: () => this.isOpen = !this.isOpen}
                }, [
                    this.data.children
                    ? this.isOpen
                    ? m("i", {class: ["fas", "fa-chevron-down"]})
                    : m("i", {class: ["fas", "fa-chevron-right"]})
                    : undefined
                ]),
                m("span", {
                    class: ["tree-text"],
                    on: {click: () => {
                        quizState.isQuizShown = true;
                        this.initQuiz(this.data.fullName);
                    }}
                }, this.data.name),
                this.isShownStat ? m("div", {
                    class: ["tree-score", "float-right", "text-align-right"]
                }, [
                    m("span", {
                        class: ["tree-new", "tree-score-child"]
                    }, this.data.stat.new.toLocaleString()),
                    m("span", {
                        class: ["tree-leech", "tree-score-child"]
                    }, this.data.stat.leech.toLocaleString()),
                    m("span", {
                        class: ["tree-due", "tree-score-child"]
                    }, this.data.stat.due.toLocaleString())
                ]) : undefined
            ]),
            this.data.children ? m("ul", {
                style: {
                    display: this.isOpen ? "block" : "none"
                }
            }, this.data.children.map((c, i) => {
                return m(TreeViewItem, {
                    props: {data: c, q: this.q, parentIsOpen: this.isOpen},
                    ref: i.toString()
                });
            })) : undefined
        ]);
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
            quizState.isQuizReady = true;
            this.readMq();
        }, 400);

        quizState.q = this.q;
        quizState.currentDeck = deckName;
        quizState.isQuizStarted = true;
    }

    private readMq(mq: MediaQueryListEvent | MediaQueryList = quizState.mediaQuery) {
        if (mq.matches && quizState.isQuizShown) {
            quizState.isDeckHidden = true;
        } else {
            quizState.isDeckHidden = false;
        }
    }
}
