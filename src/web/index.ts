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
    render(m) {
        return m("div", {class: ["h-100"]}, [
            m("nav", {
                class: ["navbar", "navbar-expand-lg", "navbar-light", "bg-light"]
            }, [
                m("a", {
                    class: ["navbar-brand"],
                    domProps: {href: "#"}
                }, "Rep2Recall"),
                m("button", {
                    class: ["navbar-toggler"],
                    attrs: {
                        "data-target": "#navbarSupportedContent",
                        "type": "button"
                    }
                }, [
                    m("span", {class: "navbar-toggler-icon"})
                ]),
                m("div", {
                    class: ["collapse", "navbar-collapse"],
                    attrs: {id: "navbarSupportedContent"}
                }, [
                    m("ul", {
                        class: ["navbar-nav", "mr-auto"]
                    }, [
                        m("li", {
                            class: ["nav-item", this.$route.path === "/quiz" ? "active" : ""]
                        }, [
                            m("router-link", {
                                class: ["nav-link"],
                                props: {to: "/quiz"}
                            }, "Quiz")
                        ]),
                        m("li", {
                            class: ["nav-item", this.$route.path === "/editor" ? "active" : ""]
                        }, [
                            m("router-link", {
                                class: ["nav-link"],
                                props: {to: "/editor"}
                            }, "Editor")
                        ]),
                        m("li", {
                            class: ["nav-item", this.$route.path === "/importExport" ? "active" : ""]
                        }, [
                            m("router-link", {
                                class: ["nav-link"],
                                props: {to: "/importExport"}
                            }, "Import")
                        ]),
                        m("li", {
                            class: ["nav-item"]
                        }, [
                            m("a", {
                                class: ["nav-link"],
                                domProps: {href: "https://github.com/patarapolw/rep2recall"},
                                attrs: {target: "_blank"}
                            }, "About")
                        ]),
                        m(Counter)
                    ]),
                    m("ul", {
                        class: ["navbar-nav"]
                    }, [
                        m(SearchBar)
                    ])
                ])
            ]),
            m("router-view")
        ]);
    },
    data: {
        displayName: null as any
    }
}).$mount("#App");
