<template lang="pug">
.stretched.editor-window
  .editor-control
    .editor-nav
      button.btn(@click="offset = 0") &lt;&lt;
      button.btn(@click="offset -= limit") &lt;
      span {{editorLabel}}
      button.btn(@click="offset += limit") &gt;
      button.btn(@click="offset = NaN") &gt;&gt;
    .editor-button-space
      b-button.editor-button(variant="outline-success" v-b-modal.new-entry-modal) New card
      span(v-if="checkedIds.size > 0")
        b-button.editor-button(variant="outline-primary" v-b-modal.edit-entry-modal) Edit
        b-dropdown.mr-3(variant="outline-secondary" split v-b-modal.rename-deck text="Change Deck")
          b-dropdown-item(@click="editTags(true)") Add tags
          b-dropdown-item(@click="editTags(false)") Remove tags
        b-button.editor-button(variant="outline-danger" @click="deleteCards") Delete cards
    .editor-input
      input.form-control(placeholder="Type here to search" type="search" v-model="q" @submit.prevent="onSearchbarEnter")
  table.table.table-hover#editorTable(:style="{width: tableWidth + 'px'}")
    colgroup
      col(:style="{width: colWidths.checkbox + 'px'}")
      col(v-for="c in tableCols" :key="c.name" :style="{width: (c.width || colWidths.extra) + 'px'}")
      col(:style="{width: '150px'}")
    thead
      tr
        th
          div
            input(type="checkbox" @click="onCheckboxClicked" ref="checkbox.main" :checked="checkedIds.size > 0"
            v-show="!allCardsSelected")
            fontawesome(:icon="['fas', 'check-double']" v-if="allCardsSelected"
            @click="allCardsSelected = false; checkedIds.clear()")
        th(v-for="c in tableCols" :key="c.name" scope="col")
          b-link(@click="onTableHeaderClicked(c.name)") {{ c.label }}
          span(v-if="sortBy === c.name") {{ desc ? ' ▲' : ' ▼'}}
        th
    tbody
      tr.fixed-header-offset
      tr(v-for="d in data" :key="d._id" @click="onTableRowClicked(d._id)" :class="{selected: checkedIds.has(d._id)}")
        td(:style="{width: '50px'}")
          div
            input(type="checkbox" @click="onCheckboxClicked($event, d._id)" :checked="checkedIds.has(d._id)")
        td(v-for="a in getOrderedDict(d)" :key="a[0]")
          .wrapper
            my-iframe.wrapped(v-if="a[2].type === 'html'" :html="getHtml(d, a[0])")
            .wrapped(v-else-if="a[2].type === 'datetime'") {{ stringifyDate(a[1]) }}
            .wrapped(v-else-if="a[2].type === 'tag'")
              p(v-for="b in a[1]" :key="b" v-html="toHtmlAndBreak(b)")
            .wrapped(v-else v-html="toHtmlAndBreak(a[1])")
        td
  entry-editor(id="new-entry-modal" title="Create new entry" @ok="onEntrySaved")
  entry-editor(id="edit-entry-modal" title="Edit entry" @ok="onEntrySaved" :entry-id="Array.from(checkedIds)[0]")
  b-modal#rename-deck(title="What do you want to rename the deck to?" @show="newDeckName = ''" @ok="onDeckRenamed")
    input(v-model="newDeckName")
  b-modal#edit-tags(@show="newTagName = ''" @ok="onNewTags")
    template(v-slot:modal-title) {{`Please enter tag names you want to ${isAddTags ? "add" : "remove"}.`}}
    input(v-model="newTagName" placeholder="Separated by spaces")
  b-toast#select-all-cards(title="Do you want to select all cards?" static)
    .float-right
      b-btn(@click="onAllCardsSelected")
  img.page-loader(src="Spinner-1s-200px.svg" v-if="isLoading")
</template>

<script lang="ts">
import { Vue, Component, Watch } from 'vue-property-decorator'
import EntryEditor from '../components/EntryEditor.vue'
import MyIframe from '../components/MyIframe.vue'
import { DateFormat, Columns, editorApi, quizApi } from '../global'
import flatpickr from 'flatpickr'
import dotProp from 'dot-prop'
import { fixData, quizDataToContent } from '../utils'

@Component({
  components: {
    EntryEditor,
    MyIframe
  }
})
export default class Editor extends Vue {
  q = '';
  offset = 0;
  limit = 10;
  count = 0;
  sortBy = 'deck';
  desc = false;
  data: any[] = [];
  checkedIds: Set<string> = new Set();
  allCardsSelected = false;
  isLoading = false;
  newDeckName = '';
  newTagName = '';
  isAddTags = false;

  colWidths = {
    checkbox: 50,
    extra: 250
  };

  mounted () {
    this.fetchData()
  }

  get editorLabel () {
    const from = this.count === 0 ? 0 : this.offset + 1
    let to = this.offset + this.data.length
    if (to < from) {
      to = from
    }

    return `${from.toLocaleString()}-${to.toLocaleString()} of ${this.count.toLocaleString()}`
  }

  get tableCols () {
    const cols = Columns.slice()
    const extraCols: string[] = []

    for (const d of this.data) {
      if (d.data) {
        for (const it of d.data) {
          if (!extraCols.includes(it.key)) {
            extraCols.push(it.key)
          }
        }
      }
    }

    if (extraCols.length > 0) {
      cols.push(
        ...[
          {
            name: 'source',
            label: 'Source'
          },
          {
            name: 'template',
            label: 'Template'
          }
        ]
      )
    }

    extraCols.forEach(c => {
      cols.push({
        name: `@${c}`,
        label: c[0].toLocaleUpperCase() + c.substr(1)
      })
    })

    return cols
  }

  get tableWidth (): number {
    return (
      this.colWidths.checkbox +
      this.tableCols
        .map(c => c.width || this.colWidths.extra)
        .reduce((a, v) => a + v)
    )
  }

  getOrderedDict (d: any): any[][] {
    const output: any[][] = []
    this.tableCols.forEach(c => {
      output.push([c.name, dotProp.get(d, c.name), c])
    })

    return output
  }

  stringifyDate (d?: string): string {
    return d ? flatpickr.formatDate(new Date(d), DateFormat) : ''
  }

  toHtmlAndBreak (s?: string): string {
    const div = document.createElement('div')
    div.innerText = s || ''
    return div.innerHTML.replace(/(_)/g, '$1<wbr/>')
  }

  async onEntrySaved (update: any) {
    this.reset()
    this.sortBy = this.checkedIds.size > 0 ? 'card.updatedAt' : 'card.createdAt'
    this.desc = true
    this.fetchData()
  }

  async deleteCards () {
    const r = await this.$bvModal.msgBoxConfirm(
      'Are you sure you want to delete the following cards'
    )

    if (r) {
      this.isLoading = true
      await editorApi.delete({
        body: { ids: Array.from(this.checkedIds) }
      })
      this.fetchData()
    }
  }

  async onDeckRenamed () {
    if (this.newDeckName) {
      this.isLoading = true
      await editorApi.update({
        body: {
          ids: Array.from(this.checkedIds),
          update: { deck: this.newDeckName }
        }
      })

      this.fetchData()
    }
  }

  editTags (isAdd: boolean) {
    this.isAddTags = isAdd
    this.$bvModal.show('edit-tags')
  }

  async onNewTags () {
    this.isLoading = true

    if (this.isAddTags) {
      await editorApi.addTags({
        body: {
          ids: Array.from(this.checkedIds),
          tags: this.newTagName.split(' ')
        }
      })
    } else {
      await editorApi.removeTags({
        body: {
          ids: Array.from(this.checkedIds),
          tags: this.newTagName.split(' ')
        }
      })
    }

    this.fetchData()
  }

  onSearchbarKeypress (evt: any) {
    if (evt.key === 'Enter') {
      this.fetchData()
    }
  }

  onCheckboxClicked (evt: any, id?: string) {
    const checkboxMain = this.$refs['checkbox.main'] as HTMLInputElement

    if (id) {
      const checkboxCurrent = evt.target as HTMLInputElement
      if (checkboxCurrent.checked) {
        this.checkedIds.add(id)
      } else {
        this.checkedIds.delete(id)
      }
      this.calculateCheckboxMainStatus()
    } else {
      checkboxMain.indeterminate = false
      if (checkboxMain.checked) {
        this.data.forEach(d => {
          this.checkedIds.add(d._id)
        })

        if (this.count > this.limit) {
          this.$bvToast.show('select-all-cards')
        }
      } else {
        this.allCardsSelected = false
        this.checkedIds.clear()
      }
    }

    this.$forceUpdate()
  }

  async onAllCardsSelected () {
    this.isLoading = true
    const { ids } = (await quizApi.get({
      body: {
        q: this.q,
        type: 'all'
      }
    })).data
    this.checkedIds = new Set(ids)
    this.allCardsSelected = true
    this.isLoading = false
  }

  onTableHeaderClicked (name: string) {
    if (this.sortBy === name) {
      this.desc = !this.desc
    } else {
      this.sortBy = name
      this.desc = false
    }
  }

  onTableRowClicked (id: string) {
    const availableIds = new Set(this.data.map(row => row._id))

    this.checkedIds.forEach(c => {
      if (!availableIds.has(c)) {
        this.checkedIds.delete(c)
      }
    })

    if (this.checkedIds.has(id)) {
      this.checkedIds.delete(id)
    } else {
      this.checkedIds.add(id)
    }

    this.calculateCheckboxMainStatus()
    this.$forceUpdate()
  }

  getHtml (data: any, side: 'front' | 'back' | 'note'): string {
    return quizDataToContent(data, side)
  }

  calculateCheckboxMainStatus () {
    const checkboxMain = this.$refs['checkbox.main'] as HTMLInputElement
    this.allCardsSelected = false
    checkboxMain.indeterminate =
      this.checkedIds.size > 0 && this.checkedIds.size < this.data.length
  }

  reset (clearSearchParams: boolean = true) {
    if (clearSearchParams) {
      this.q = ''
      this.offset = 0
    }

    this.allCardsSelected = false
    const checkboxMain = this.$refs['checkbox.main'] as HTMLInputElement
    checkboxMain.indeterminate = false
    this.checkedIds.clear()
  }

  @Watch('offset')
  @Watch('sortBy')
  @Watch('desc')
  async fetchData () {
    if (isNaN(this.offset)) {
      this.offset = this.count - this.limit
    } else if (this.offset < 0) {
      this.offset = 0
    }

    this.isLoading = true

    const r = (await editorApi.get({
      body: {
        q: this.q,
        offset: this.offset,
        limit: this.limit,
        sort: {
          key: this.sortBy,
          desc: this.desc
        }
      }
    })).data

    this.data = r.data.map((d: any) => fixData(d))
    this.count = r.count

    this.reset(false)
    document.getElementById('editorTable')!.scrollIntoView()

    this.isLoading = false
  }
}
</script>

<style lang="scss">
.editor-window {
  $control-height: 50px;
  $editor-input-width: 300px;

  .editor-control {
    z-index: 200;
    height: 3em;
    width: 100%;
    background-color: rgb(233, 233, 233);
    align-items: center;
    display: flex;
    top: 0px;
    height: $control-height;
    position: fixed;

    .editor-nav {
      white-space: nowrap;

      span {
        padding: 1em;
      }
    }

    .editor-button-space {
      padding-right: $editor-input-width + 100px;
      white-space: nowrap;

      .editor-button {
        min-width: 100px;
        margin-right: 1em;

        .dropdown-toggle-split {
          width: 0 !important;
        }
      }
    }

    .editor-input {
      position: fixed;
      display: inline-block;
      right: 1em;
      width: $editor-input-width;
    }

    ::-webkit-scrollbar {
      width: 0px; /* Remove scrollbar space */
      background: transparent; /* Optional: just make scrollbar invisible */
    }
  }

  table {
    $thead-height: 50px;

    thead {
      position: sticky;
      position: -webkit-sticky;
      top: $control-height;
      height: $thead-height;
      z-index: 100;
      background-color: rgba($color: white, $alpha: 0.8);

      th {
        position: sticky;
        position: -webkit-sticky;
        top: $control-height;
        height: $thead-height;
        z-index: 100;
        background-color: rgba($color: white, $alpha: 0.8);

        > a {
          color: black;

          &:hover {
            color: blue;
          }
        }
      }
    }

    tr {
      &.selected {
        background: lightblue;
      }
    }

    td {
      ::-webkit-scrollbar {
        width: 0px; /* Remove scrollbar space */
        background: transparent; /* Optional: just make scrollbar invisible */
      }
    }

    .fixed-header-offset {
      height: $control-height;
    }
  }

  .wrapper {
    overflow: scroll;
    height: 150px;
    max-width: 400px;
    position: relative;

    .wrapped {
      word-break: break-word;
      width: 100%;
      height: 100%;
    }
  }
}

.no-border {
  border: none;
  padding-left: 0;
}
</style>
