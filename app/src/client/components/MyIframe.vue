<template lang="pug">
iframe(:src="iframeUrl" frameborder="0")
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import { BASE_URL } from '../global'

@Component
export default class MyIframe extends Vue {
  @Prop({ default: '' }) html!: string;

  get iframeUrl () {
    return `${BASE_URL}/reveal`
  }

  mounted () {
    const iframe = this.$el as HTMLIFrameElement
    iframe.onload = () => {
      this.updateHtml()
    }
  }

  @Watch('html')
  updateHtml () {
    const iframe = this.$el as HTMLIFrameElement
    if (iframe.contentDocument) {
      iframe.contentDocument.body.innerHTML = this.html
    }
  }
}
</script>

<style lang="scss">
iframe {
  margin: 0;
  padding: 1em;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}
</style>
