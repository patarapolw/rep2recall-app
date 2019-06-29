import { Vue, Component, Watch } from "vue-property-decorator";
import h from "hyperscript";
import swal from "sweetalert";
import $ from "jquery";
import "./quiz.scss";
import TreeviewItem, { ITreeViewItem } from "./TreeviewItem";
import EntryEditor from "../editor/EntryEditor";
import { slowClick, fetchJSON, quizDataToContent } from "../util/util";
import { shuffle } from "../../node/util";

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
            h("img.small-spinner", {attrs: {
                "src": "Spinner-1s-200px.svg",
                "v-if": "isLoading"
            }}),
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
        h("b-modal", {attrs: {
            "id": "quiz-modal",
            "scrollable": "",
            "hide-header": "",
            "v-on:show": "onQuizShown",
            "v-on:hide": "getTreeViewData"
        }}, [
            h("iframe", {attrs: {
                ":srcdoc": "quizContentPrefix + quizContent",
                "frameBorder": "0"
            }}),
            h(".counter", [
                h("small", "{{currentQuizIndex >= 0 ? ((currentQuizIndex + 1).toLocaleString() + ' of ' + quizIds.length.toLocaleString()) : ''}}")
            ]),
            h(".w-100.d-flex.justify-content-between", {attrs: {
                "slot": "modal-footer"
            }}, [
                h("div", {style: {width: "50px"}}, [
                    h("button.btn.btn-secondary.quiz-previous", {attrs: {
                        "v-if": "currentQuizIndex > 0",
                        "v-on:click": "onQuizPreviousButtonClicked"
                    }}, "<")
                ]),
                h("div", [
                    h("button.btn.btn-primary.ml-2.quiz-toggle.quiz-show", {attrs: {
                        "v-if": "currentQuizIndex >= 0 && !quizShownAnswer",
                        "v-on:click": "quizShownAnswer = true",
                    }}, "Show"),
                    h("button.btn.btn-secondary.ml-2.quiz-toggle.quiz-hide", {attrs: {
                        "v-if": "currentQuizIndex >= 0 && quizShownAnswer",
                        "v-on:click": "quizShownAnswer = false",
                    }}, "Hide"),
                    h("button.btn.btn-success.ml-2.quiz-right", {attrs: {
                        "v-if": "quizShownAnswer",
                        "v-on:click": "onQuizRightButtonClicked"
                    }}, "Right"),
                    h("button.btn.btn-danger.ml-2.quiz-wrong", {attrs: {
                        "v-if": "quizShownAnswer",
                        "v-on:click": "onQuizWrongButtonClicked"
                    }}, "Wrong"),
                    h("b-button.ml-2.quiz-edit", {attrs: {
                        "variant": "info",
                        "v-if": "quizShownAnswer",
                        "v-b-modal.edit-entry-modal": ""
                    }}, "Edit"),
                ]),
                h("div", {style: {width: "50px"}}, [
                    h("b-button.float-right.quiz-next", {attrs: {
                        "v-if": "quizIds.length > 0 && currentQuizIndex < quizIds.length - 1",
                        "v-on:click": "onQuizNextButtonClicked",
                        "variant": "secondary"
                    }}, ">")
                ])
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
    private quizContentPrefix = `
    <script>
    window.addEventListener("keydown", (evt) => {
        const {type, key} = evt;
        parent.$("#quiz-modal").trigger(parent.$.Event(type, {key}));
    });
    </script>`;
    private quizContent = "";
    private quizShownAnswer = false;
    private quizData: any = {};
    private selectedDeck = "";

    public mounted() {
        this.getTreeViewData();
        $(document.body).on("keydown", "#quiz-modal", this.keyboardHandler);
    }

    public update() {
        this.getTreeViewData();
    }

    public destroyed() {
        $(document.body).off("keydown", "#quiz-modal", this.keyboardHandler);
    }

    private keyboardHandler(evt: JQuery.KeyDownEvent) {
        const keyControl = {
            toggle() {
                const $toggle = $(".quiz-toggle");
                if ($toggle.length > 0) {
                    slowClick($toggle);
                } else {
                    slowClick($(".quiz-next"));
                }
            },
            previous() {
                slowClick($(".quiz-previous"));
            }
        }

        switch(evt.key) {
            case "Enter":
            case " ": keyControl.toggle(); break;
            case "Backspace": 
            case "ArrowLeft":keyControl.previous(); break;
            case "ArrowRight": slowClick($(".quiz-next")); break;
            case "ArrowUp": slowClick($(".quiz-hide")); break;
            case "ArrowDown": slowClick($(".quiz-show")); break;
            case "1": slowClick($(".quiz-right")); break;
            case "2": slowClick($(".quiz-wrong")); break;
            case "3": slowClick($(".quiz-edit")); break;
            default: console.log(evt.key);
        }
    }

    private onInputKeypress(evt: any) {
        if (evt.key === "Enter") {
            this.getTreeViewData();
        }
    }

    private onQuizShown() {
        this.currentQuizIndex = -1;
        this.quizIds = [];
        this.quizShownAnswer = false;
        this.quizContent = "";
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
            const {ids} = await fetchJSON("/api/quiz/", {deck, q: this.q, type: "all"})
            await fetchJSON("/api/editor/", {ids}, "DELETE");
            await swal({
                text: `Deleted ${deck}`,
                icon: "success"
            });
            this.$forceUpdate();
            return true;
        }

        return false;
    }

    private async onQuizPreviousButtonClicked() {
        if (this.currentQuizIndex > 0) {
            this.currentQuizIndex--;
            await this.renderQuizContent();
        }
    }

    private async onQuizNextButtonClicked() {
        if (this.currentQuizIndex < this.quizIds.length - 1) {
            this.currentQuizIndex += 1;
            await this.renderQuizContent();
        } else {
            swal({
                text: "Quiz is done!",
                icon: "success",
                buttons: [true, true]
            }).then((r) => {
                if (r) {
                    this.$bvModal.hide("quiz-modal");
                }
            });
        }
    }

    @Watch("quizShownAnswer")
    private onQuizShowButtonClicked() {
        if (this.quizShownAnswer) {
            this.quizContent = quizDataToContent(this.quizData, "backAndNote");
        } else {
            this.quizContent = quizDataToContent(this.quizData, "front");
        }
    }

    private async onQuizRightButtonClicked() {
        if (this.quizShownAnswer) {
            const id = this.quizIds[this.currentQuizIndex];
            await fetchJSON("/api/quiz/right", {id}, "PUT")
            await this.onQuizNextButtonClicked();
        }
    }

    private async onQuizWrongButtonClicked() {
        if (this.quizShownAnswer) {
            const id = this.quizIds[this.currentQuizIndex];
            await fetchJSON("/api/quiz/wrong", {id}, "PUT")
            await this.onQuizNextButtonClicked();
        }
    }

    private async onEntrySaved(u: any) {
        this.quizData.data = Object.assign(this.quizData.data || {}, u.data || {});
        delete u.data;
        Object.assign(this.quizData, u);
        this.onQuizShowButtonClicked();
    }

    private async getTreeViewData() {
        this.isLoading = true;
        this.data = await fetchJSON("/api/quiz/treeview", {q: this.q});
        this.isLoading = false;
    }

    private async renderQuizContent() {
        this.quizShownAnswer = false;
        const id = this.quizIds[this.currentQuizIndex];
        if (id) {
            this.quizData = await fetchJSON("/api/quiz/render", {id});
            this.quizContent = quizDataToContent(this.quizData, "front");
        }
    }
}
