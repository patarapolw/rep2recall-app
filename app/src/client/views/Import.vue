<template lang="pug">
.container.mt-3
  h3 Import file
  .input-group
    .custom-file
      input.custom-file-input(type="file" accept=".apkg, .r2r, .db" @change="onImportFileChanged")
      label.custom-file-label {{ importFile ? importFile.name : 'Please file to upload (*.apkg, *.r2r, *.db)' }}
    .input-group-append
      button.btn.btn-outline-success.input-group-text(:disabled="!importFile"
      @click="onImportButtonClicked") Upload
  b-modal(ref="uploadModal" hide-footer hide-header-close title="Uploading" @hide="preventHide")
    div {{progress.text}}
    .progress.mt-3(:style="{display: progress.max ? 'block': 'none'}")
      .progress-bar.progress-bar-striped(role="progressbar"
      :aria-valuenow="progress.current" aria-valuemin="0" :aria-valuemax="progress.max"
      :style="{width: getProgressPercent(), transition: 'none'}")
      | {{progress.max === 1 ? getProgressPercent() : `${progress.current} of ${progress.max}`}}
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import io from 'socket.io-client'
import { BASE_URL } from '../global'

@Component
export default class Import extends Vue {
  importFile: File | null = null;
  progress: any = {};

  getProgressPercent () {
    return (
      (this.progress.max
        ? (this.progress.current / this.progress.max) * 100
        : 100
      ).toFixed(0) + '%'
    )
  }

  preventHide (e: any) {
    if (this.progress.text) {
      e.preventDefault()
    }
  }

  onImportFileChanged (e: any) {
    this.importFile = e.target.files[0]
  }

  onImportButtonClicked () {
    const formData = new FormData()
    formData.append('file', this.importFile!);
    (this.$refs.uploadModal as any).show()

    this.progress = {
      text: 'Uploading...'
    }

    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = evt => {
      Object.assign(this.progress, {
        text: `Uploading ${this.importFile!.name}`,
        current: evt.loaded / evt.total,
        max: 1
      })
    }
    xhr.onload = () => {
      Object.assign(this.progress, {
        text: `Parsing ${this.importFile!.name}`,
        max: 0
      })
      const { id } = JSON.parse(xhr.responseText)
      const ws = io(location.origin)
      let started = false

      ws.on('connect', () => {
        if (!started) {
          ws.send({
            id,
            type: /\.[^.]+$/.exec(this.importFile!.name)![0]
          })
          started = true
        }
      })

      ws.on('message', (msg: any) => {
        try {
          Vue.set(this, 'progress', msg)
          if (this.progress.error || !this.progress.text) {
            ws.close()
          }
        } catch (e) {
          console.log(msg)
        }
      })
    }

    xhr.open('PUT', `${BASE_URL}/api/io/`)
    xhr.send(formData)
  }

  @Watch('progress')
  private watchProgress () {
    if (!this.progress.text) {
      (this.$refs.uploadModal as any).hide()

      if (this.progress.error) {
        this.$bvModal.msgBoxOk(this.progress.error)
      } else {
        this.$bvModal.msgBoxOk('Success')
      }
    }
  }
}
</script>
