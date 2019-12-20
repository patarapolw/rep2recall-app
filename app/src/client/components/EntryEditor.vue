<template lang="pug">
b-modal(:id="id" :title="title" size="lg" @show="onModalShown" @ok="onModalOk")
  img.page-loader(v-if="isLoading" src="Spinner-1s-200px.svg")
  form.col-12.needs-validation(ref="form")
    .col-12.mb-3
      .row
        label.col-form-label.col-sm-2 Deck
        input.form-control.col-sm-10(:value="update.deck || data.deck" required
        @input="$set(update, 'deck', $event.target.value)")
        .invalid-feedback Deck is required.
    .col-12.mb-3
      .row
        label.col-form-label.mb-1 Front
        markdown-editor(:value="update.front || getParsedData('front') || ''" required
        @input="$set(update, 'front', $event)"
        invalid-feedback="Front is required."
        :data="deepMerge(data, update)")
    .col-12.mb-3
      .row
        label.col-form-label.mb-1 Back
        markdown-editor(:value="update.back || getParsedData('back') || ''"
        @input="$set(update, 'back', $event)"
        :data="deepMerge(data, update)")
    .col-12.mb-3
      .row
        label.col-form-label.mb-1 Mnemonic
        markdown-editor(:value="update.mnemonic || getParsedData('mnemonic') || ''"
        @input="$set(update, 'mnemonic', $event)"
        :data="deepMerge(data, update)")
    .col-12.mb-3
      .row
        label.col-form-label.col-sm-2 Tags
        tag-editor.col-sm-10(:value="(update.tag || data.tag) ? (update.tag || data.tag).join(' ') : ''"
        @input="$set(update, 'tag', $event.split(' '))")
    .col-12.mb-3(v-if="entryId")
      .row
        label.col-form-label.col-sm-2 SRS Level
        input.form-control.col-sm-10(:value="update.srsLevel || data.srsLevel"
        @input="$set(update, 'srsLevel', $event.target.value)")
    .col-12.mb-3(v-if="entryId")
      .row
        label.col-form-label.col-sm-2 Next Review
        datetime-nullable.col-sm-10(:value="update.nextReview || data.nextReview"
        @input="$set(update, 'nextReview', $event)")
    .col-12.mb-3
      h4.mb-3 Template Data
    .col-12.mb-3(v-if="entryId")
      .row
        label.col-form-label.col-sm-2 Source
        input.form-control.col-sm-10(:value="dotProp.get(data, 'source.name')" readonly)
    .col-12.mb-3(v-if="entryId")
      .row
        label.col-form-label.col-sm-2 Template
        input.form-control.col-sm-10(:value="dotProp.get(data, 'template.name')" readonly)
    .col-12.mb-3
      .row
        .col-6
          b-button.form-control(variant="success" v-b-modal.css-editor) Edit CSS
        .col-6
          b-button.form-control(variant="warning" v-b-modal.js-editor) Edit JavaScript
    .col-12.mb-3(v-for="c in dataCols")
      .row
        label.col-form-label.col-sm-2 {{c.label}}
        textarea.form-control.col-sm-10(:value="dotProp.get(update, c.name) || dotProp.get(data, c.name)"
        @input="dotProp.set(update, c.name, $event.target.value)")
    .col-12.mb-3
      .row
        input.form-control.col-sm-6.no-border(@keypress="onExtraRowInput"
        placeholder="Type here and press Enter to add more keys...")
  b-modal#css-editor(title="CSS Editor" @ok="$set(update, 'css', $refs.css.codemirror.getValue())")
    codemirror(ref="css" :value="update.css || data.css" :options="{mode: 'text/css'}")
  b-modal#js-editor(title="JavaScript Editor" @ok="$set(update, 'js', $refs.js.codemirror.getValue())")
    codemirror(ref="js" :value="update.js || data.js" :options="{mode: 'text/javascript'}")
</template>

<script lang="ts">
import { Vue, Component, Prop, Emit } from 'vue-property-decorator'
import DatetimeNullable from './DatetimeNullable.vue'
import TagEditor from './TagEditor.vue'
import MarkdownEditor from './MarkdownEditor.vue'
import dotProp from 'dot-prop'
import deepMerge from 'lodash.merge'
import { Columns, editorApi } from '../global'
import { fixData } from '../utils'

@Component({
  components: {
    DatetimeNullable,
    TagEditor,
    MarkdownEditor
  }
})
export default class EntryEditor extends Vue {
  @Prop({ required: true }) id!: string;
  @Prop() entryId?: string;
  @Prop() title!: string;

  data: any = {};
  update: any = {};
  isLoading = false;

  dotProp = dotProp;
  deepMerge = deepMerge;

  get dataCols () {
    return Object.keys(this.data.data || {})
      .map((c) => {
        return {
          name: `@${c}`,
          label: c
        }
      })
  }

  getParsedData (key: string) {
    let v: string = this.data[key] || ''

    if (v.startsWith('@rendered\n')) {
      v =
        '@template\n' +
        (this.data[`t${key[0].toLocaleUpperCase() + key.substr(1)}`] || '')
    }

    return v
  }

  onExtraRowInput (evt: any) {
    const k = evt.target.value

    if (evt.key === 'Enter') {
      evt.preventDefault()

      if (k) {
        if (!this.data.data) {
          Vue.set(this.data, 'data', [])
        }

        let toAdd = true
        for (const it of this.data.data) {
          if (it.key === k) {
            toAdd = false
          }
        }
        if (toAdd) {
          this.data.data.push({
            key: k,
            value: ''
          })
        }

        evt.target.value = ''
      }
    }
  }

  async onModalShown () {
    this.data = {}
    this.update = {}
    this.$nextTick(() => {
      (this.$refs.form as HTMLElement).classList.remove('was-validated')
    })

    if (this.entryId) {
      this.isLoading = true

      const { data } = await editorApi.get({
        body: { q: { 'card___id': this.entryId } }
      })

      Vue.set(this, 'data', fixData(data.data[0]))
    }

    this.isLoading = false
  }

  @Emit('ok')
  async onModalOk (evt: any) {
    for (const c of Columns) {
      if (c.required) {
        if (this.update[c.name] === undefined && !this.data[c.name]) {
          (this.$refs.form as HTMLElement).classList.add('was-validated')
          evt.preventDefault()
          return {}
        }
      }
    }

    if (Object.keys(this.update).length > 0) {
      if (this.entryId) {
        const r = await editorApi.update({
          body: { ids: [this.entryId], update: this.update }
        })
        if (r.status === 200) {
          this.$bvModal.msgBoxOk('Updated')
        }
      } else {
        const r = await editorApi.create({
          body: { create: [this.update] }
        })
        if (r.status === 200) {
          this.$bvModal.msgBoxOk('Created')
        }
      }
    }

    return this.update
  }
}
</script>
