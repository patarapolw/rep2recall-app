import Vue from "vue";
import VueRouter from "vue-router";
import Counter from "./DbEditor/component/Counter";
import SearchBar from "./DbEditor/component/SearchBar";
import "./index.scss";
import Quiz from "./Quiz/Quiz";
import BootstrapVue from "bootstrap-vue";
import "bootstrap";
import CardEditor from "./DbEditor/CardEditor";
import TemplateEditor from "./DbEditor/TemplateEditor";
import ImportExport from "./ImportExport";
import m from "hyperscript";
import "./contextmenu";

Vue.use(VueRouter);
Vue.use(BootstrapVue);

const router = new VueRouter({
    routes: [
        {name: "default", path: "/", component: Quiz},
        {name: "quiz", path: "/quiz", component: Quiz},
        {name: "cardEditor", path: "/editor/card", component: CardEditor},
        {name: "templateEditor", path: "/editor/template", component: TemplateEditor},
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
                    m("li.nav-item.dropdown", [
                        m("a.nav-link.dropdown-toggle#editorDropdown", {
                            "href": "#",
                            "role": "button",
                            "data-toggle": "dropdown",
                            "aria-haspopup": "true",
                            "aria-expanded": "true"
                        }, "Editor"),
                        m("div.dropdown-menu", {"aria-labelledby": "editorDropdown"}, [
                            m("router-link.dropdown-item", {attrs: {to: "/editor/card"}}, "Card"),
                            m("router-link.dropdown-item", {attrs: {to: "/editor/template"}}, "Template")
                        ])
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
