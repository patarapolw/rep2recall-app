import { defineAPI, GET, POST, PUT, DELETE } from 'rest-ts-core'
import { Ids } from './editor'

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

export class QuizGet {
  constructor (
    public readonly q: string,
    public readonly deck?: string,
    public readonly type?: 'all' | 'due' | 'leech' | 'new',
    public readonly due?: string
  ) {}
}

export class QuizTreeview {
  constructor (
    public readonly q: string
  ) {}
}

export class QuizTreeviewResponse {
  constructor (
    public readonly treeview: ITreeViewItem[]
  ) {}
}

export class QuizRender {
  constructor (
    public readonly front?: string,
    public readonly back?: string,
    public readonly mnemonic?: string,
    public readonly css?: string,
    public readonly js?: string
  ) {}
}

const quizApiDefinition = defineAPI({
  get: POST`/`.body(QuizGet).response(Ids),
  treeview: POST`/treeview`.body(QuizTreeview).response(QuizTreeviewResponse),
  render: GET`/${'id'}`.response(QuizRender),
  right: PUT`/${'id'}`,
  wrong: DELETE`/${'id'}`
})

export default quizApiDefinition
