<template lang="pug">
li.treeview(v-if="!isDeleted")
  span.caret(@click="onCaretClicked")
    fontawesome(v-if="data.children && isOpen" :icon="['fas', 'chevron-down']")
    fontawesome(v-if="data.children && !isOpen" :icon="['fas', 'chevron-right']")
  span.tree-text(ref="tree-text" @click="startReview") {{ data.name }}
  .float-right.text-align-right.tree-score(v-if="isShownStat")
    span.tree-new {{ data.stat.new.toLocaleString() }}
    span.tree-leech {{ data.stat.leech.toLocaleString() }}
    span.tree-due {{ data.stat.due.toLocaleString() }}
  ul(v-if="data.children && isOpen")
    treeview-item(v-for="c in data.children" :key="c.fullName"
    :data="c" :q="q" :parent-is-open="isOpen" :on-review="onReview" :on-delete="onDelete")
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator'
import quizState from '../states/quiz'
import $ from 'jquery'

interface ITreeViewStat {
  new: number;
  leech: number;
  due: number;
}

export interface ITreeViewItem {
  name: string;
  fullName: string;
  isOpen: boolean;
  children?: ITreeViewItem[];
  stat: ITreeViewStat;
}

@Component({
  name: 'treeview-item'
})
export default class TreeviewItem extends Vue {
  @Prop({ required: true }) data!: ITreeViewItem;
  @Prop({ required: true }) q!: string;
  @Prop({ required: true }) parentIsOpen!: boolean;
  @Prop({ required: true }) onReview!: (deck: string, type?: string) => any;
  @Prop({ required: true }) onDelete!: (deck: string) => Promise<boolean>;

  isOpen = false;
  isShownStat = true;
  isDeleted = false;

  state = quizState;

  constructor (props: any) {
    super(props)
    this.isOpen =
      this.data.isOpen !== undefined ? this.data.isOpen : this.isOpen
  }

  mounted () {
    $(this.$refs['tree-text']).data({
      dueAndNew: () => this.startReview(),
      due: () => this.startReview('due'),
      leech: () => this.startReview('leech'),
      new: () => this.startReview('new'),
      all: () => this.startReview('all'),
      exportDeck: () => {
        location.href = `/api/io/export?deck=${encodeURIComponent(
          this.data.fullName
        )}`
      },
      exportDeckAndReset: () => {
        location.href = `/api/io/export?deck=${encodeURIComponent(
          this.data.fullName
        )}&reset=true`
      },
      delete: async () => {
        if (await this.onDelete(this.data.fullName)) {
          this.isDeleted = true
        }
      }
    })
    this.updateStat()
  }

  async startReview (type?: string) {
    await this.onReview(this.data.fullName, type)
    this.updateStat()
  }

  @Watch('q')
  @Watch('isOpen')
  updateStat () {
    if (!this.data.children || (this.parentIsOpen && !this.isOpen)) {
      this.isShownStat = true
    } else {
      this.isShownStat = false
    }
  }

  readMq (mq: MediaQueryListEvent | MediaQueryList = this.state.mediaQuery) {
    if (mq.matches && this.state.isQuizShown) {
      this.state.isDeckHidden = true
    } else {
      this.state.isDeckHidden = false
    }
  }

  onCaretClicked () {
    this.isOpen = !this.isOpen
  }
}
</script>

<style lang="scss">
.treeview {
  .caret {
    width: 1em;
  }

  ul {
    list-style-type: none;
  }

  .tree-text {
    cursor: pointer;

    &:hover {
      color: blue;
    }
  }

  .tree-score {
    > span {
      min-width: 1em;
      display: inline-block;
      padding-left: 1em;
    }

    .tree-new {
      color: green;
    }

    .tree-leech {
      color: red;
    }

    .tree-due {
      color: blue;
    }
  }
}
</style>
