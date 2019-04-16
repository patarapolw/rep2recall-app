import { Vue, Component } from "vue-property-decorator";
import { CreateElement } from "vue";
import DbEditor from "./DbEditor";

@Component
export default class TemplateEditor extends Vue {
    public render(m: CreateElement) {
        return m(DbEditor, {props: {
            cols: [
                {name: "name", width: 150, type: "one-line", required: true},
                {name: "front", width: 400, type: "markdown", required: true},
                {name: "back", width: 400, type: "markdown"},
                {name: "css", width: 400, type: "multi-line"}
            ],
            editorApi: "/template/editor/",
            sortBy: "name"
        }});
    }
}
