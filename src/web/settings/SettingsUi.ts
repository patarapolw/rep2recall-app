import { Vue, Component } from "vue-property-decorator";
import h from "hyperscript";
import { fetchJSON } from "../util/util";
import swal from "sweetalert";

@Component({
    template: h(".container.mt-3", [
        h("h3", "Media file location"),
        h("p", [
            h("span", "Media files are accessible at "),
            h("a", {attrs: {
                href: "#",
                "v-on:click": "openMediaFolder"
            }}, "{{ mediaFolder }}"),
            h("span", " as "),
            h("code", "/media/filename.ext")
        ]),
        h("h3.mt-3.danger", "Reset user database"),
        h(".row", [
            h(".col-8.danger", "Please ensure you want to reset the database"),
            h(".col-4", [
                h("button.btn.btn-danger.form-control", {attrs: {
                    "v-on:click": "onResetDatabaseClicked"
                }}, "Reset database")
            ])
        ])
    ]).outerHTML
})
export default class SettingsUi extends Vue {
    private mediaFolder = ""

    public mounted() {
        fetchJSON("/api/media/").then((r) => {
            this.mediaFolder = r.path;
        });
    }

    private openMediaFolder() {
        // @ts-ignore
        if (window.process && window.process.type) {
            require("electron").shell.openItem(this.mediaFolder);
        }
    }

    private async onResetDatabaseClicked() {
        const r = await swal({
            text: "Please ensure you want to reset the database. The app will restart afterwards.",
            icon: "warning",
            buttons: [true, true],
            dangerMode: true
        });

        if (r) {
            await fetchJSON("/api/reset", {}, "DELETE")
            // @ts-ignore
            if (window.process && window.process.type) {
                await swal({
                    text: "App server will now restart.",
                    icon: "info"
                });
                const ipc = require("electron").ipcRenderer;
                ipc.send("restart-server");
            } else {
                await swal({
                    text: "Please manually restart the app server.",
                    icon: "info"
                });
            }
        }
    }
}
