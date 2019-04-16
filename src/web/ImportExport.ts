import { Vue, Component } from "vue-property-decorator";
import m from "hyperscript";
// @ts-ignore
import smalltalk from "smalltalk";

@Component({
    template: m(".container.mt-3", [
        m(".row", [
            m("h3", "Choose Anki file (*.apkg) to import:")
        ]),
        m(".input-group", [
            m(".custom-file", [
                m("input.custom-file-input#importFileInput", {
                    type: "file",
                    accept: ".apkg",
                    attrs: {"v-on:change": "onImportFileChanged"}
                }),
                m("label.custom-file-label", {
                    "for": "importFileInput",
                    "aria-describedby": "importFileButton"
                }, "{{importFile ? importFile.name : 'Choose file'}}")
            ]),
            m(".input-group-append", [
                m("button.btn.btn-outline-success.input-group-text#importFileButton", {
                    attrs: {
                        ":disabled": "!importFile",
                        "v-on:click": "onImportButtonClicked"
                    }
                }, "Upload")
            ]),
            m("img.float-right", {
                src: "/asset/Spinner-1s-200px.svg",
                style: {height: "2em"},
                attrs: {":style": "{display: isLoading ? 'inline-block' : 'none'}"}
            })
        ])
    ]).outerHTML
})
export default class ImportExport extends Vue {
    private importFile: File | null = null;
    private isLoading = false;

    private onImportFileChanged(e: any) {
        this.importFile = e.target.files[0];
    }

    private onImportButtonClicked() {
        const formData = new FormData();
        formData.append("apkg", this.importFile!);
        this.isLoading = true;
        fetch("/io/import/anki", {method: "POST", body: formData}).then((r) => {
            if (r.status !== 201) {
                smalltalk.alert("Error", "Not uploaded");
            } else {
                smalltalk.alert("Result", "Uploaded");
            }
            this.isLoading = false;
        });
    }
}
