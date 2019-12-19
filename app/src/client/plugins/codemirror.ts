import Vue from 'vue'
import VueCodemirror from 'vue-codemirror'
import 'codemirror/addon/display/autorefresh'
import 'codemirror/mode/markdown/markdown'
import 'codemirror/mode/css/css'
import 'codemirror/mode/javascript/javascript'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/base16-light.css'

Vue.use(VueCodemirror, {
  options: {
    lineNumbers: true,
    lineWrapping: true,
    autoRefresh: true,
    theme: 'base16-light',
    autoCloseBrackets: true
  }
})
