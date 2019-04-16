import { Vue, Component } from "vue-property-decorator";
import { CreateElement } from "vue";
import DbEditor from "./DbEditor";
import globalState from "../shared";

@Component
export default class CardEditor extends Vue {
    public render(m: CreateElement) {
        return m(DbEditor, {props: {
            cols: globalState.cols,
            editorApi: globalState.cardEditorApi,
            sortBy: "deck"
        }});
    }
}
