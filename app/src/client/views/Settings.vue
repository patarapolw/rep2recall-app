<template lang="pug">
.container.mt-3
  h3 Media file location
  p
    | Media files are accessible at&nbsp;
    b-link(@click="openMediaFolder") {{mediaFolder}}
    | &nbsp;as&nbsp;
    code /media/filename.ext
  h3.mt-3.danger Reset user database
  .row
    .col-8.danger Please ensure you want to reset the database
    .col-4
      button.btn.btn-danger.form-control(@click="onResetDatabaseClicked") Reset database
</template>

<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import { shell } from "electron";
import { ax } from "../global";

@Component
export default class Settings extends Vue {
  mediaFolder = "";

  mounted() {
    ax.post("/api/media/").then(r => {
      this.mediaFolder = r.data.path;
    });
  }

  openMediaFolder() {
    shell.openItem(this.mediaFolder);
  }

  async onResetDatabaseClicked() {
    const r = await this.$bvModal.msgBoxConfirm(
      "Please ensure you want to reset the database. The app will restart afterwards.");

    if (r) {
      const rDelete = await ax.delete("/api/reset");
      if (rDelete.status === 201) {
        this.$bvModal.msgBoxOk("Database is reset");
      }
    }
  }
}
</script>

<style lang="scss">
.danger {
  color: red;
}
</style>