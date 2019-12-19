<template lang="pug">
.input-group.col-form-label
  input.form-control(:value="value" @input="$emit('input', $event.target.value)"
  placeholder="Please input tags separated by spaces.")
  .input-group-append
    button.btn.input-group-text(:class="tagSet.has('marked') ? 'btn-warning' : 'btn-success'"
    @click="onMarkButtonClicked") {{tagSet.has('marked') ? 'Unmark' : 'Mark'}}
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from 'vue-property-decorator'

@Component
export default class TagEditor extends Vue {
  @Prop({ required: true }) value!: string;

  get tagSet () {
    return new Set(this.value.split(' ').filter(v => v))
  }

  @Emit('input')
  onMarkButtonClicked () {
    if (this.tagSet.has('marked')) {
      this.tagSet.delete('marked')
    } else {
      this.tagSet.add('marked')
    }
    return Array.from(this.tagSet)
      .filter(v => v)
      .join(' ')
  }
}
</script>
