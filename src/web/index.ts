import h from "hyperscript";
import "./index.scss";
import Vue from "vue";
import VueRouter from "vue-router";
import BootstrapVue from "bootstrap-vue";
import "bootstrap";
import $ from "jquery";
import QuizUi from "./quiz/QuizUi";
import EditorUi from "./editor/EditorUi";
import ImportUi from "./import/ImportUi";
import "./contextmenu";
import SettingsUi from "./settings/SettingsUi";
import { slowClick } from "./util/util";

// @ts-ignore
import VueCodemirror from "vue-codemirror";
import "codemirror/addon/display/autorefresh";
import "codemirror/mode/markdown/markdown";
import "codemirror/mode/css/css";
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/edit/closebrackets";

$(() => {
    // @ts-ignore
    $('.tooltip-enabled').tooltip({trigger: "hover"});
    $(document.body).on("mousedown", "button", (evt) => {
        const $this = $(evt.target);
        $this.prop("disabled", true);
        slowClick($this);
    })
});


Vue.use(VueRouter);
Vue.use(BootstrapVue);
Vue.use(VueCodemirror, {
    options: {
        lineNumbers: true,
        lineWrapping: true,
        autoRefresh: true,
        theme: "base16-light",
        autoCloseBrackets: true
    }
});

const router = new VueRouter({
    routes: [
        {path: "/", component: QuizUi},
        {path: "/quiz", component: QuizUi},
        {path: "/editor", component: EditorUi},
        {path: "/import", component: ImportUi},
        {path: "/settings", component: SettingsUi}
    ]
});

const app = new Vue({
    router,
    template: h(".stretched", [
        h("ul.nav.flex-column", [
            h("li.nav-item", [
                h("router-link.far.fa-question-circle.nav-icon.nav-link.tooltip-enabled", {
                    title: "Quiz",
                    attrs: {to: "/quiz"}
                })
            ]),
            h("li.nav-item", [
                h("router-link.far.fa-edit.nav-icon.nav-link.tooltip-enabled", {
                    title: "Editor",
                    attrs: {to: "/editor"}
                }),
            ]),
            h("li.nav-item", [
                h("router-link.fas.fa-file-import.nav-icon.nav-link.tooltip-enabled", {
                    title: "Import",
                    attrs: {to: "/import"}
                }),
            ]),
            h("li.nav-item", [
                h("router-link.fas.fa-cog.nav-icon.nav-link.tooltip-enabled", {
                    title: "Settings",
                    attrs: {to: "/settings"}
                }),
            ]),
            h("li.nav-item", [
                h("a.fab.fa-github.nav-icon.nav-link.tooltip-enabled", {
                    title: "About",
                    href: "https://github.com/patarapolw/rep2recall-py",
                    target: "_blank"
                })
            ])
        ]),
        h(".body", [
            h("router-view")
        ])
    ]).outerHTML
}).$mount("#App");
