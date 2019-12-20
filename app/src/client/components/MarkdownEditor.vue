<template lang="pug">
.w-100
  .d-flex.markdown-editor(:class="required ? 'form-required' : 'form-not-required'")
    .col-6
      codemirror.w-100(:value="value" @input="onValueChanged($event)" :options="{mode: 'text/markdown'}")
    .col-6
      my-iframe.preview(:html="html")
    input.form-control.flatten(:required="required" :value="value")
    .invalid-feedback {{ invalidFeedback || '' }}
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from 'vue-property-decorator'
import { quizDataToContent, ankiMustache } from '../utils'
import MyIframe from './MyIframe.vue'

@Component({
  components: {
    MyIframe
  }
})
export default class MarkdownEditor extends Vue {
  @Prop() required?: boolean;
  @Prop({ default: '' }) value!: string;
  @Prop() invalidFeedback?: string;
  @Prop({ required: true }) data: any;

  html: string = '';

  @Emit('input')
  onValueChanged (newValue: string) {
    this.html = quizDataToContent(
      this.data,
      null,
      ankiMustache(newValue, this.data)
    )
    return newValue
  }
}
</script>

<style lang="scss">
.markdown-editor {
  .CodeMirror {
    border: 1px solid lightgray;
    padding: 0;
  }

  .CodeMirror,
  .CodeMirror-scroll {
    height: 150px;
    min-height: 150px;
  }

  .preview {
    padding: 0 !important;
  }
}

.flatten {
  display: none;
}

.needs-validation.was-validated {
  .form-not-required {
    border: 1px solid #28a745;
    border-radius: 0.25rem;
  }

  .form-required {
    border: 1px solid red;
    border-radius: 0.25rem;
  }
}
</style>
