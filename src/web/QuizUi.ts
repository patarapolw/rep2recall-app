import { Vue, Component } from "vue-property-decorator";
import h from "hyperscript";
import TreeviewItem, { ITreeViewItem } from "./quiz/TreeviewItem";
import { fetchJSON, md2html, shuffle } from "./util";
import swal from "sweetalert";
import EntryEditor from "./editor/EntryEditor";

@Component({
    components: { TreeviewItem, EntryEditor },
    template: h(".container.mt-3", [
        h("div.ml-3", [
            h("i", "Click or right-click deck names to start reviewing.")
        ]),
        h("input.form-control", {
            placeholder: "Type here to search",
            attrs: {
                "v-model": "q",
                "v-on:keyup": "onInputKeypress",
                "spellcheck": "false",
                "autocomplete": "off",
                "autocorrect": "off",
                "autocapitalize": "off"
            }
        }, "{{ q }}"),
        h(".treeview", [
            h("img.small-spinner", {
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
                    ":parent-is-open": "true",
                    ":on-review": "onReview",
                    ":on-delete": "onDelete"
                }})
            ])
        ]),
        h("b-modal.quiz-modal", {attrs: {
            "id": "quiz-modal",
            "scrollable": "",
            "hide-header": "",
            "v-on:hide": "getTreeViewData"
        }}, [
            h("iframe", {attrs: {
                ":srcdoc": "quizContent",
                "height": "500",
                "width": "450",
                "frameBorder": "0"
            }}),
            h("div", {attrs: {
                "slot": "modal-footer"
            }}, [
                h("button.btn.btn-warning.ml-2", {attrs: {
                    "v-if": "currentQuizIndex > 0",
                    "v-on:click": "onQuizPreviousButtonClicked",
                }}, "Previous"),
                h("button.btn.btn-primary.ml-2", {attrs: {
                    "v-if": "!quizShownAnswer && currentQuizIndex >= 0",
                    "v-on:click": "onQuizShowButtonClicked"
                }}, "Show"),
                h("button.btn.btn-success.ml-2", {attrs: {
                    "v-if": "quizShownAnswer",
                    "v-on:click": "onQuizRightButtonClicked"
                }}, "Right"),
                h("button.btn.btn-danger.ml-2", {attrs: {
                    "v-if": "quizShownAnswer",
                    "v-on:click": "onQuizWrongButtonClicked"
                }}, "Wrong"),
                h("b-button.ml-2", {attrs: {
                    "variant": "info",
                    "v-if": "quizShownAnswer",
                    "v-b-modal.edit-entry-modal": ""
                }}, "Edit"),
                h("button.btn.btn-warning.ml-2", {attrs: {
                    "v-if": "quizIds.length > 0 && currentQuizIndex < quizIds.length - 1",
                    "v-on:click": "onQuizNextButtonClicked"
                }}, "Next")
            ])
        ]),
        h("entry-editor", {attrs: {
            "id": "edit-entry-modal",
            "title": "Edit entry",
            ":entry-id": "quizIds[currentQuizIndex]",
            "v-on:ok": "onEntrySaved"
        }})
    ]).outerHTML
})
export default class QuizUi extends Vue {
    private isLoading = true;
    private data: ITreeViewItem[] = [];
    private q = "";

    private quizIds: number[] = [];
    private currentQuizIndex: number = -1;
    private quizContent = "";
    private quizShownAnswer = false;
    private quizData: any = {};

    private selectedDeck = "";

    public mounted() {
        this.getTreeViewData();
    }

    public update() {
        this.getTreeViewData();
    }

    private onInputKeypress(evt: any) {
        if (evt.key === "Enter") {
            this.getTreeViewData();
        }
    }

    private async getTreeViewData() {
        this.currentQuizIndex = -1;
        this.isLoading = true;
        this.data = await fetchJSON("/api/quiz/treeview", {q: this.q});
        this.isLoading = false;
    }

    private async onReview(deck: string, type?: string) {
        this.$bvModal.show("quiz-modal");
        const {ids} = await fetchJSON("/api/quiz/", {deck, q: this.q, type})

        this.quizIds = shuffle(ids);
        this.quizContent = h("div", `${ids.length.toLocaleString()} entries to go...`).outerHTML;
        if (ids.length === 0) {
            const [nextHour, nextDay] = await Promise.all([
                fetchJSON("/api/quiz/", {deck, q: this.q, type, due: "1h"}),
                fetchJSON("/api/quiz/", {deck, q: this.q, type, due: "1d"})
            ]);

            this.quizContent += h("div", [
                h("div", `Pending next hour: ${nextHour.ids.length.toLocaleString()}`),
                h("div", `Pending next day: ${nextDay.ids.length.toLocaleString()}`)
            ]).outerHTML;
        }
    }

    private async onDelete(deck: string): Promise<boolean> {
        const r = await swal({
            text: `Are you sure you want to delete ${deck}?`,
            icon: "warning",
            dangerMode: true,
            buttons: [true, true]
        })

        if (r) {
            const {ids} = await fetchJSON("/api/quiz/", {deck, q: this.q, due: null})
            await fetchJSON("/api/editor/", {ids}, "DELETE");
            await swal({
                text: `Deleted ${deck}`,
                icon: "success"
            });
            return true;
        }

        return false;
    }

    private async renderQuizContent() {
        this.quizShownAnswer = false;
        const id = this.quizIds[this.currentQuizIndex];
        if (id) {
            this.quizData = await fetchJSON("/api/quiz/render", {id});
            this.quizContent = md2html(this.quizData.front);
        }
    }

    private async onQuizPreviousButtonClicked() {
        this.currentQuizIndex--;
        await this.renderQuizContent();
    }

    private async onQuizNextButtonClicked() {
        this.currentQuizIndex++;
        await this.renderQuizContent();
    }

    private onQuizShowButtonClicked() {
        this.quizContent = md2html(this.quizData.back);
        this.quizShownAnswer = true;
    }

    private async onQuizRightButtonClicked() {
        const id = this.quizIds[this.currentQuizIndex];
        await fetchJSON("/api/quiz/right", {id}, "PUT")
        await this.onQuizNextButtonClicked();
    }

    private async onQuizWrongButtonClicked() {
        const id = this.quizIds[this.currentQuizIndex];
        await fetchJSON("/api/quiz/wrong", {id}, "PUT")
        await this.onQuizNextButtonClicked();
    }

    private async onEntrySaved(data: any) {
        await fetchJSON("/api/editor/", {id: data.id, update: data}, "PUT");
        Object.assign(this.quizData, data);
    }
}
