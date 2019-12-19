import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const router = new VueRouter({
  routes: [
    {
      path: '/quiz',
      alias: '/',
      component: () => import(/* webpackChuckName: "quiz" */ '../views/Quiz.vue')
    },
    {
      path: '/editor',
      component: () => import(/* webpackChuckName: "editor" */ '../views/Editor.vue')
    },
    {
      path: '/import',
      component: () => import(/* webpackChuckName: "import" */ '../views/Import.vue')
    },
    {
      path: '/settings',
      component: () => import(/* webpackChuckName: "settings" */ '../views/Settings.vue')
    }
  ]
})

export default router
