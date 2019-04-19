import Vue from "vue";
import VueRouter from "vue-router";
import Counter from "./DbEditor/component/Counter";
import SearchBar from "./DbEditor/component/SearchBar";
import "./index.scss";
import Quiz from "./Quiz/Quiz";
import BootstrapVue from "bootstrap-vue";
import "bootstrap";
import CardEditor from "./DbEditor/CardEditor";
import ImportExport from "./ImportExport";
import m from "hyperscript";
import "./contextmenu";

Vue.use(VueRouter);
Vue.use(BootstrapVue);

const router = new VueRouter({
    routes: [
        {name: "default", path: "/", component: Quiz},
        {name: "quiz", path: "/quiz", component: Quiz},
        {name: "cardEditor", path: "/editor", component: CardEditor},
        {name: "importExport", path: "/importExport", component: ImportExport}
    ]
});

const app = new Vue({
    router,
    components: {Counter, SearchBar},
    template: m("div.h-100", [
        m("nav.navbar.navbar-expand-lg.navbar-light.bg-light", [
            m("a.navbar-brand", {href: "#"}, "Rep2Recall"),
            m("button.navbar-toggler", {
                "data-target": "#navbarSupportedContent",
                "type": "button"
            }, [
                m("span.navbar-toggler-icon")
            ]),
            m("div.collapse.navbar-collapse#navbarSupportedContent", [
                m("ul.navbar-nav.mr-auto", [
                    m("li", {
                        class: "['nav-item', $route.path === '/quiz' ? 'active' : '']"
                    }, [
                        m("router-link.nav-link", {attrs: {to: "/quiz"}}, "Quiz")
                    ]),
                    m("li", {
                        class: "['nav-item', $route.path === '/editor' ? 'active' : '']"
                    }, [
                        m("router-link.nav-link", {attrs: {to: "/editor"}}, "Editor")
                    ]),
                    m("li", {
                        class: "['nav-item', $route.path === '/importExport' ? 'active' : '']"
                    }, [
                        m("router-link.nav-link", {attrs: {to: "/importExport"}}, "Import")
                    ]),
                    m("li.nav-item", [
                        m("a.nav-link", {
                            href: "https://github.com/patarapolw/rep2recall",
                            target: "_blank"
                        }, "About")
                    ]),
                    m("counter")
                ]),
                m("ul.navbar-nav", [
                    m("search-bar")
                ])
            ])
        ]),
        m("router-view")
    ]).outerHTML
}).$mount("#App");
