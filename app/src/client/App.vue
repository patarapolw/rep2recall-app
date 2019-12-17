<template lang="pug">
.stretched
  .nav.flex-column
    b-nav-item(v-b-tooltip.hover title="Quiz" to="/quiz")
      fontawesome(:icon="['far', 'question-circle']")
    b-nav-item(v-b-tooltip.hover title="Editor" to="/editor")
      fontawesome(:icon="['far', 'edit']")
    b-nav-item(v-b-tooltip.hover title="Import" to="/import")
      fontawesome(:icon="['fas', 'file-import']")
    b-nav-item(v-b-tooltip.hover title="Settings" to="/settings")
      fontawesome(:icon="['fas', 'cog']")
    b-nav-item(v-b-tooltip.hover title="GitHub" @click="openInExternal('https://github.com/patarapolw/rep2recall-app')")
      fontawesome(:icon="['fab', 'github']")
  .body
    router-view
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import { shell } from "electron";

@Component
export default class App extends Vue {
  openInExternal(url: string) {
    shell.openExternal(url);
  }
}
</script>

<style lang="scss">
$nav-button-size: 70px;

.stretched {
  width: 100%;
  height: 100%;
}

.body {
  position: fixed;
  border: 1px solid lightgray;
  height: 100%;
  width: 100%;
  left: $nav-button-size;
  top: 0;
  overflow: scroll;
}
</style>