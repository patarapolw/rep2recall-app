<template lang="pug">
.input-group.datetime-nullable(:style="{width: width + 'px !important'}")
  input.form-control(ref="flatpickr")
  .input-group-append
    button.btn.btn-outline-danger.input-group-text(:disabled="!value" @click="setDate()") ×
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.min.css'
import { DateFormat } from '../global'
import { normalizeArray } from '../utils'

@Component
export default class DatetimeNullable extends Vue {
  @Prop({ required: true }) width!: number;
  @Prop({ required: true }) value!: string;
  @Prop() readonly?: boolean;

  flatpickr?: flatpickr.Instance;

  mounted () {
    this.flatpickr = normalizeArray(
      flatpickr(this.$refs.flatpickr as HTMLInputElement, {
        enableTime: true,
        defaultDate: this.formatDate(this.value),
        dateFormat: DateFormat,
        clickOpens: !this.readonly,
        onClose: dates => {
          if (dates.length > 0) {
            this.setDate(dates[0])
          }
        }
      })
    )
  }

  setDate (d?: Date) {
    if (this.flatpickr) {
      if (d) {
        this.flatpickr.setDate(d)
      } else {
        this.flatpickr.clear()
      }
    }

    this.$emit('input', d ? d.toISOString() : null)
  }

  formatDate (d: string) {
    const dDate = d ? new Date(d) : undefined
    return dDate
  }
}
</script>

<style lang="scss">
.datetime-nullable {
  &.input-group {
    padding: 0;
  }

  > input {
    background-color: white !important;
  }
}
</style>
