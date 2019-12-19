import Vue from 'vue'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faFileImport, faCog, faCheckDouble, faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { faQuestionCircle, faEdit } from '@fortawesome/free-regular-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(
  faFileImport, faCog, faCheckDouble, faChevronDown, faChevronRight,
  faQuestionCircle, faEdit,
  faGithub
)

Vue.component('fontawesome', FontAwesomeIcon)
