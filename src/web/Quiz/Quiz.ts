import quizShared from "./shared";
import DeckArea from "./DeckArea";
import QuizArea from "./QuizArea";
import { Vue, Component } from "vue-property-decorator";
import { CreateElement } from "vue";

@Component
export default class Quiz extends Vue {
    private state = {
        quiz: quizShared
    };

    public render(m: CreateElement) {
        return m("div", {
            class: {
                "container-fluid": this.state.quiz.isQuizShown,
                "container": !this.state.quiz.isQuizShown,
                "row": true,
                "col-12": true
            }
        }, [
            m(DeckArea),
            m(QuizArea)
        ]);
    }

    public created() {
        this.state.quiz.isDeckHidden = false;
        this.state.quiz.isQuizReady = false;
        this.state.quiz.isQuizShown = false;
    }
}
