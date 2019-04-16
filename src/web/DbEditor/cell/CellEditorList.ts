import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { CreateElement } from "vue";
import CellEditorListItem from "./CellEditorListItem";
import uuid from "uuid/v4";
import dbEditorState from "../shared";

@Component
export default class CellEditorList extends Vue {
    private id?: number;
    private colName?: string;

    private config = dbEditorState.editor.list;

    constructor(props: any) {
        super(props);
        this.config.show = this.show;
    }

    public render(m: CreateElement) {
        const body = [] as any[];

        for (const k of Object.keys(this.config.valueDict)) {
            if (this.config.valueDict[k]) {
                body.push(m(CellEditorListItem, {
                    props: {id: k},
                    on: {
                        delete: () => {
                            delete this.config.valueDict[k];
                            this.$forceUpdate();
                        },
                        occupied: () => this.$forceUpdate()
                    }
                }));
            }
        }

        const _k = uuid();
        body.push(m(CellEditorListItem, {props: {id: _k,
            addRowCallback: () => this.$forceUpdate(),
            deleteRowCallback: () => {
                delete this.config.valueDict[_k];
                this.$forceUpdate();
            }
        }}));

        return m("b-modal", {
            ref: "cellEditorList",
            props: {size: "lg"},
            attrs: {"hide-footer": true}
        }, [
            body,
            m("b-button", {
                on: {click: () => this.onSave()}
            }, "Save")
        ]);
    }

    private show(id: number, colName: string, value?: string[]) {
        this.id = id;
        this.colName = colName;

        const valueDict = {} as any;
        if (value && value.length > 0) {
            value.forEach((el: string) => {
                valueDict[uuid()] = el;
            });
        }

        valueDict[uuid()] = null;

        this.config.valueDict = valueDict;
        (this.$refs.cellEditorList as any).show();
    }

    @Emit("save")
    private onSave() {
        let value: string[] = Object.values(this.config.valueDict);
        value = value.filter((el, i) => el && value.indexOf(el) === i);
        this.config.valueDict = {};
        (this.$refs.cellEditorList as any).hide();

        return {id: this.id, colName: this.colName, value};
    }
}
