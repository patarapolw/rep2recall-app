import h from "hyperscript";
import "./index.scss";
import Vue from "vue";
import VueRouter from "vue-router";
import BootstrapVue from "bootstrap-vue";
// @ts-ignore
import VueSimplemde from "vue-simplemde";
import "bootstrap";
import $ from "jquery";
import QuizUi from "./QuizUi";
import EditorUi from "./EditorUi";
import ImportUi from "./ImportUi";

// @ts-ignore
$(() => $('.tooltip-enabled').tooltip());

Vue.use(VueRouter);
Vue.use(BootstrapVue);
Vue.use(VueSimplemde);

const router = new VueRouter({
    routes: [
        {path: "/", component: QuizUi},
        {path: "/quiz", component: QuizUi},
        {path: "/editor", component: EditorUi},
        {path: "/import", component: ImportUi}
    ]
});

const app = new Vue({
    router,
    template: h(".stretched", [
        h(".navbar.float-left", [
            h("div", [
                h("router-link.far.fa-question-circle.tooltip-enabled", {
                    title: "Quiz",
                    attrs: {to: "/quiz"}
                })
            ]),
            h("div", [
                h("router-link.far.fa-edit.tooltip-enabled", {
                    title: "Editor",
                    attrs: {to: "/editor"}
                })
            ]),
            h("div", [
                h("router-link.fas.fa-file-import.tooltip-enabled", {
                    title: "Import",
                    attrs: {to: "/import"}
                })
            ]),
            h("div", [
                h("a.fab.fa-github.tooltip-enabled", {
                    title: "About",
                    href: "https://github.com/patarapolw/rep2recall-kt"
                })
            ])
        ]),
        h(".body", [
            h("router-view")
        ])
    ]).outerHTML
}).$mount("#App");
