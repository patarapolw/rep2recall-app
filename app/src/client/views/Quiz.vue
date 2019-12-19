<template lang="pug">
.container.mt-3
  .ml-3
    i Click or right-click deck names to start reviewing.
  input.form-control(type="search" placeholder="Type here to search"
  v-model="q" @keyup="onInputKeypress")
  .treeview
    img.small-spinner(v-if="isLoading" src="Spinner-1s-200px.svg")
    ul
      treeview-item(v-for="c in data" :key="c.fullName"
      :data="c" :q="q" parent-is-open :on-review="onReview" :on-delete="onDelete")
  b-modal#quiz-modal(scrollable hide-header @show="onQuizShown" @hide="getTreeViewData")
    my-iframe(:html="quizContentPrefix + quizContent")
    .counter
      small {{currentQuizIndex >= 0 ? ((currentQuizIndex + 1).toLocaleString() + ' of ' + quizIds.length.toLocaleString()) : ''}}
    .w-100.d-flex.justify-content-between(slot="modal-footer")
      div(:style="{width: '50px'}")
        button.btn.btn-secondary.quiz-previous(v-if="currentQuizIndex > 0"
        @click="onQuizPreviousButtonClicked") &lt;
      div
        button.btn.btn-primary.ml-2.quiz-toggle.quiz-show(v-if="currentQuizIndex >= 0 && !quizShownAnswer"
        @click="quizShownAnswer = true") Show
        button.btn.btn-secondary.ml-2.quiz-toggle.quiz-hide(v-if="currentQuizIndex >= 0 && quizShownAnswer"
        @click="quizShownAnswer = false") Hide
        button.btn.btn-success.ml-2.quiz-right(v-if="quizShownAnswer"
        @click="onQuizRightButtonClicked") Right
        button.btn.btn-danger.ml-2.quiz-wrong(v-if="quizShownAnswer"
        @click="onQuizWrongButtonClicked") Wrong
        b-button.ml-2.quiz-edit(v-if="quizShownAnswer" variant="info"
        v-b-modal.edit-entry-modal) Edit
      div(:style="{width: '50px'}")
        b-button.float-right.quiz-next(v-if="quizIds.length > 0 && currentQuizIndex < quizIds.length - 1"
        @click="onQuizNextButtonClicked" variant="secondary") &gt;
  entry-editor(id="edit-entry-modal" title="Edit entry" :entry-id="quizIds[currentQuizIndex]"
  @ok="onEntrySaved")
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import { quizDataToContent, shuffle, slowClick } from '../utils'
import TreeviewItem, { ITreeViewItem } from '../components/TreeviewItem.vue'
import EntryEditor from '../components/EntryEditor.vue'
import MyIframe from '../components/MyIframe.vue'
import $ from 'jquery'
import h from 'hyperscript'
import { quizApi, editorApi } from '../global'

@Component({
  components: {
    TreeviewItem,
    EntryEditor,
    MyIframe
  }
})
export default class Quiz extends Vue {
  isLoading = true;
  data: ITreeViewItem[] = [];
  q = '';

  quizIds: string[] = [];
  currentQuizIndex: number = -1;
  quizContentPrefix =
    `
    <` +
    `script>
    window.addEventListener("keydown", (evt) => {
        const {type, key} = evt;
        parent.$("#quiz-modal").trigger(parent.$.Event(type, {key}));
    });
    <` +
    `/script>`;
  quizContent = '';
  quizShownAnswer = false;
  quizData: any = {};
  selectedDeck = '';

  mounted () {
    this.getTreeViewData()
    $(document.body).on('keydown', '#quiz-modal', this.keyboardHandler)
  }

  update () {
    this.getTreeViewData()
  }

  destroyed () {
    $(document.body).off('keydown', '#quiz-modal', this.keyboardHandler)
  }

  keyboardHandler (evt: JQuery.KeyDownEvent) {
    const keyControl = {
      toggle () {
        const $toggle = $('.quiz-toggle')
        if ($toggle.length > 0) {
          slowClick($toggle)
        } else {
          slowClick($('.quiz-next'))
        }
      },
      previous () {
        slowClick($('.quiz-previous'))
      }
    }

    switch (evt.key) {
      case 'Enter':
      case ' ':
        keyControl.toggle()
        break
      case 'Backspace':
      case 'ArrowLeft':
        keyControl.previous()
        break
      case 'ArrowRight':
        slowClick($('.quiz-next'))
        break
      case 'ArrowUp':
        slowClick($('.quiz-hide'))
        break
      case 'ArrowDown':
        slowClick($('.quiz-show'))
        break
      case '1':
        slowClick($('.quiz-right'))
        break
      case '2':
        slowClick($('.quiz-wrong'))
        break
      case '3':
        slowClick($('.quiz-edit'))
        break
      default:
        console.log(evt.key)
    }
  }

  onInputKeypress (evt: any) {
    if (evt.key === 'Enter') {
      this.getTreeViewData()
    }
  }

  onQuizShown () {
    this.currentQuizIndex = -1
    this.quizIds = []
    this.quizShownAnswer = false
    this.quizContent = ''
  }

  async onReview (deck: string, type?: 'all' | 'new' | 'due' | 'leech') {
    this.$bvModal.show('quiz-modal')

    const { ids } = (await quizApi.get({
      body: { deck, q: this.q, type }
    })).data

    this.quizIds = shuffle(ids)
    this.quizContent = h(
      'div',
      `${ids.length.toLocaleString()} entries to go...`
    ).outerHTML
    if (ids.length === 0) {
      const [nextHour, nextDay] = await Promise.all([
        quizApi.get({
          body: { deck, q: this.q, type, due: '1h' }
        }),
        quizApi.get({
          body: { deck, q: this.q, type, due: '1d' }
        })
      ])

      this.quizContent += h('div', [
        h('div', `Pending next hour: ${nextHour.data.ids.length.toLocaleString()}`),
        h('div', `Pending next day: ${nextDay.data.ids.length.toLocaleString()}`)
      ]).outerHTML
    }
  }

  async onDelete (deck: string): Promise<boolean> {
    const r = await this.$bvModal.msgBoxConfirm(`Are you sure you want to delete ${deck}?`)

    if (r) {
      const { ids } = (await quizApi.get({
        body: {
          deck,
          q: this.q,
          type: 'all'
        }
      })).data
      await editorApi.delete({
        body: { ids }
      })
      await this.$bvModal.msgBoxOk(`Deleted ${deck}`)
      this.$forceUpdate()
      return true
    }

    return false
  }

  async onQuizPreviousButtonClicked () {
    if (this.currentQuizIndex > 0) {
      this.currentQuizIndex--
      await this.renderQuizContent()
    }
  }

  async onQuizNextButtonClicked () {
    if (this.currentQuizIndex < this.quizIds.length - 1) {
      this.currentQuizIndex += 1
      await this.renderQuizContent()
    } else {
      const r = await this.$bvModal.msgBoxConfirm('Quiz is done!')
      if (r) {
        this.$bvModal.hide('quiz-modal')
      }
    }
  }

  @Watch('quizShownAnswer')
  onQuizShowButtonClicked () {
    if (this.quizShownAnswer) {
      this.quizContent = quizDataToContent(this.quizData, 'backAndNote')
    } else {
      this.quizContent = quizDataToContent(this.quizData, 'front')
    }
  }

  async onQuizRightButtonClicked () {
    if (this.quizShownAnswer) {
      const id = this.quizIds[this.currentQuizIndex]
      await quizApi.right({
        params: { id }
      })
      await this.onQuizNextButtonClicked()
    }
  }

  async onQuizWrongButtonClicked () {
    if (this.quizShownAnswer) {
      const id = this.quizIds[this.currentQuizIndex]
      await quizApi.wrong({
        params: { id }
      })
      await this.onQuizNextButtonClicked()
    }
  }

  async onEntrySaved (u: any) {
    this.quizData.data = Object.assign(this.quizData.data || {}, u.data || {})
    delete u.data
    Object.assign(this.quizData, u)
    this.onQuizShowButtonClicked()
  }

  async getTreeViewData () {
    this.isLoading = true
    this.data = (await quizApi.treeview({
      body: { q: this.q }
    })).data.treeview
    this.isLoading = false
  }

  async renderQuizContent () {
    this.quizShownAnswer = false
    const id = this.quizIds[this.currentQuizIndex]
    if (id) {
      this.quizData = (await quizApi.render({
        params: { id }
      })).data
      this.quizContent = quizDataToContent(this.quizData, 'front')
    }
  }
}
</script>
