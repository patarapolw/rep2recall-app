import { Vue, Component, Watch } from "vue-property-decorator";
import h from "hyperscript";
import swal from "sweetalert";

@Component({
    template: h(".container.mt-3", [
        h("h3", "Choose *.apkg file to import"),
        h(".input-group", [
            h(".custom-file", [
                h("input.custom-file-input", {
                    type: "file",
                    accept: ".apkg",
                    attrs: {
                        "v-on:change": "onImportFileChanged"
                    }
                }),
                h("label.custom-file-label", "{{ importFile ? importFile.name : 'Choose file to upload' }}")
            ]),
            h(".input-group-append", [
                h("button.btn.btn-outline-success.input-group-text", {
                    attrs: {
                        ":disabled": "!importFile",
                        "v-on:click": "onImportButtonClicked"
                    }
                }, "Upload")
            ])
        ]),
        h("b-modal", {
            attrs: {
                "ref": "uploadModal",
                "hide-footer": "",
                "hide-header-close": "",
                "title": "Uploading",
                "v-on:hide": "preventHide"
            }
        }, [
            h("div", "{{progress.text}}"),
            h(".progress.mt-3", {
                attrs: {
                    ":style": "{display: progress.max ? 'block': 'none'}"
                }
            }, [
                    h(".progress-bar.progress-bar-striped", {
                        attrs: {
                            "role": "progressbar",
                            ":aria-valuenow": "progress.current",
                            "aria-valuemin": "0",
                            ":aria-valuemax": "progress.max",
                            ":style": "{width: getProgressPercent(), transition: 'none'}"
                        }
                    }, "{{progress.max === 1 ? getProgressPercent() : `${progress.current} of ${progress.max}`}}")
                ])
        ])
    ]).outerHTML
})
export default class ImportUi extends Vue {
    private importFile: File | null = null;
    private progress: any = {};

    private getProgressPercent() {
        return (this.progress.max ? this.progress.current / this.progress.max * 100 : 100).toFixed(0) + "%";
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

        this.progress = {
            text: "Uploading..."
        };

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
            const { id } = JSON.parse(xhr.responseText);

            fetch("/api/io/anki/progress", {
                method: "POST",
                body: JSON.stringify({
                    id,
                    filename: this.importFile!.name
                }),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then((r) => {
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
                            const allLogs = p.split("\n");
                            this.progress = JSON.parse(allLogs[allLogs.length - 1]);
                            console.log(this.progress);
                        } catch (e) {}
                    }
                })();
            });
        };

        xhr.open("POST", "/api/io/anki/import");
        xhr.send(formData);
    }

    @Watch("progress")
    private watchProgress() {
        if (!this.progress.text) {
            (this.$refs.uploadModal as any).hide();

            if (this.progress.error) {
                swal({
                    text: this.progress.error,
                    icon: "error"
                })
            } else {
                swal({
                    title: "Success",
                    icon: "success"
                })
            }
        }
    }
}
