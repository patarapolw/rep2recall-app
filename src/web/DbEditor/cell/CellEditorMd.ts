import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import dbEditorState from "../shared";
import MarkdownEditor from "../entry/MarkdownEditor";

@Component
export default class CellEditorMd extends Vue {
    private id?: number;
    private colName?: string;
    private value: string = "";

    private config = dbEditorState.editor.html;

    constructor(props: any) {
        super(props);
        this.config.show = this.show;
    }

    public render(m: CreateElement) {
        return m("b-modal", {
            ref: "cellEditorHtml",
            props: {size: "lg"},
            attrs: {"hide-footer": true, "hide-header": true}
        }, [
            m(MarkdownEditor, {
                class: ["mb-3", "cell-editor-md", "mr-2", "ml-2"],
                on: {input: (v: string) => this.value = v},
                props: {value: this.value}
            }),
            m("b-button", {
                on: {click: () => this.onSave()}
            }, "Save")
        ]);
    }

    @Emit("save")
    public onSave() {
        (this.$refs.cellEditorHtml as any).hide();

        return {id: this.id, colName: this.colName, value: this.value};
    }

    private show(id: number, colName: string, value: string) {
        this.id = id;
        this.colName = colName;
        this.value = value;

        (this.$refs.cellEditorHtml as any).show();
    }
}
