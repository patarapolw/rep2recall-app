<template lang="pug">
.stretched
  .nav.flex-column.nav-column
    b-nav-item(v-b-tooltip.hover.right title="Quiz" to="/quiz")
      fontawesome(:icon="['far', 'question-circle']")
    b-nav-item(v-b-tooltip.hover.right title="Editor" to="/editor")
      fontawesome(:icon="['far', 'edit']")
    b-nav-item(v-b-tooltip.hover.right title="Import" to="/import")
      fontawesome(:icon="['fas', 'file-import']")
    b-nav-item(v-b-tooltip.hover.right title="Settings" to="/settings")
      fontawesome(:icon="['fas', 'cog']")
    b-nav-item(v-b-tooltip.hover.right title="GitHub" @click="openInExternal('https://github.com/patarapolw/rep2recall-app')")
      fontawesome(:icon="['fab', 'github']")
  .body
    router-view
  #update-notification(v-if="updateMsg")
    p {{updateMsg}}
    button(@click="updateMsg = ''") Close
    button(@click="restartApp" v-if="updateDownloaded") Restart
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import { shell , ipcRenderer } from "electron";

@Component
export default class App extends Vue {
  updateMsg = "";
  updateDownloaded = false;

  mounted() {
    ipcRenderer.on('update_available', () => {
      ipcRenderer.removeAllListeners('update_available');
      this.updateMsg = 'A new update is available. Downloading now...';
    });
    ipcRenderer.on('update_downloaded', () => {
      ipcRenderer.removeAllListeners('update_downloaded');
      this.updateMsg = 'Update Downloaded. It will be installed on restart. Restart now?';
      this.updateDownloaded = true;
    });
  }

  openInExternal(url: string) {
    shell.openExternal(url);
  }

  restartApp() {
    ipcRenderer.send('restart_app');
  }
}
</script>

<style lang="scss">
$nav-button-size: 70px;

div[role=tooltip] {
  pointer-events: none;
}

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

.nav-column {
  .nav-item {
    width: $nav-button-size;
    padding-top: 0;
    padding-bottom: 0;
  }

  .nav-link {
    width: $nav-button-size;
    height: $nav-button-size;
    font-size: 50px;
    text-decoration: none !important;
    color: darkblue;
    padding: 0.5rem 0.5rem;

    &:hover {
      color: blue;
    }
  }
}

iframe {
  margin: 0;
  padding: 1em;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;

  &.html-view {
    min-width: 400px;
    min-height: 500px;
  }
}

.animated {
  animation: simple-animation 0.8s linear;

  @keyframes simple-animation {
    99% {
      opacity: 0.5;
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }
}

.btn:active {
  transition: all 0.5s ease-in;
  opacity: 0.5;
  transform: scale(1.1);
}

input,
textarea {
  &.form-control {
    background-color: white !important;
  }
}

pre {
  white-space: pre-wrap;
}

#update-notification {
  position: fixed;
  bottom: 20px;
  left: 20px;
  width: 200px;
  padding: 20px;
  border-radius: 5px;
  background-color: white;
  box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
}

.hidden {
  display: none;
}
</style>