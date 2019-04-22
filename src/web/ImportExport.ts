import { Vue, Component } from "vue-property-decorator";
import m from "hyperscript";
import dbEditorState from "./DbEditor/shared";

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
                    attrs: { "v-on:change": "onImportFileChanged" }
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
            ])
        ]),
        m("b-modal", {
            attrs: {
                "ref": "uploadModal",
                "hide-footer": true,
                "hide-header-close": true,
                "title": "Uploading",
                "v-on:hide": "preventHide"
            }
        }, [
                m("div", "{{progress.text}}"),
                m(".progress.mt-3", {
                    attrs: {
                        ":style": "{display: progress.max ? 'block': 'none'}"
                    }
                }, [
                        m(".progress-bar.progress-bar-striped", {
                            attrs: {
                                "role": "progressbar",
                                ":aria-valuenow": "progress.current",
                                "aria-valuemin": "0",
                                ":aria-valuemax": "progress.max",
                                ":style": "{width: progress.getPercent(), transition: 'none'}"
                            }
                        }, "{{progress.max === 1 ? progress.getPercent() : `${progress.current} of ${progress.max}`}}")
                    ])
            ])
    ]).outerHTML
})
export default class ImportExport extends Vue {
    private importFile: File | null = null;
    private progress = {
        text: "",
        current: 0,
        max: 0,
        getPercent() {
            return (this.max ? this.current / this.max * 100 : 100).toFixed(0) + "%";
        }
    };

    constructor(props: any) {
        super(props);
        dbEditorState.counter.isActive = false;
        dbEditorState.searchBar.isActive = false;
    }

    private preventHide(e: any) {
        if (this.progress.text) {
            e.preventDefault();
        }
    }

    private onImportFileChanged(e: any) {
        this.importFile = e.target.files[0];
    }

    private onImportButtonClicked() {
        const formData = new FormData();
        formData.append("apkg", this.importFile!);
        (this.$refs.uploadModal as any).show();

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (evt) => {
            Object.assign(this.progress, {
                text: `Uploading ${this.importFile!.name}`,
                current: evt.loaded / evt.total,
                max: 1
            });
        };
        xhr.onload = () => {
            Object.assign(this.progress, {
                text: `Parsing ${this.importFile!.name}`,
                max: 0
            });
            const { fileId } = JSON.parse(xhr.responseText);

            fetch("/io/import/anki/progress", {
                method: "POST",
                body: JSON.stringify({
                    fileId,
                    filename: this.importFile!.name
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then((r) => {
                console.log(r);

                const reader = r.body!.getReader();
                const textDecoder = new TextDecoder();
                let finished = false;

                (async () => {
                    while (!finished) {
                        const {value, done} = await reader.read();
                        if (done) {
                            finished = true;
                            (this.$refs.uploadModal as any).hide();
                        }

                        const p = textDecoder.decode(value).trimRight();

                        console.log(p);
                        try {
                            Object.assign(this.progress, JSON.parse(p));
                        } catch (e) {}
                    }

                    this.progress.text = "";
                    (this.$refs.uploadModal as any).hide();
                })();
            });
        };

        xhr.open("POST", "/io/import/anki");
        xhr.send(formData);
    }
}
