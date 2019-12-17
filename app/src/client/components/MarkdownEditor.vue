<template lang="pug">
.w-100
  .d-flex.markdown-editor(:class="required ? 'form-required' : 'form-not-required'")
    .col-6
      codemirror.w-100(:value="value" @input="onValueChanged($event)" :options="{mode: 'text/markdown'}")
    .col-6
      iframe.preview(:srcdoc="html" frameborder="0")
    input.form-control.flatten(:required="required" :value="value")
    .invalid-feedback {{ invalidFeedback || '' }}
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from "vue-property-decorator";
import { quizDataToContent, ankiMustache } from "../utils";

@Component
export default class MarkdownEditor extends Vue {
  @Prop() required?: boolean;
  @Prop({ default: "" }) value!: string;
  @Prop() invalidFeedback?: string;
  @Prop({ required: true }) data: any;

  html: string = "";

  @Emit("input")
  onValueChanged(newValue: string) {
    this.html = quizDataToContent(
      this.data,
      null,
      ankiMustache(newValue, this.data)
    );
    return newValue;
  }
}
</script>