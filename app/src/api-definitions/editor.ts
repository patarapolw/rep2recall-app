import { IEntry } from '../server/engine/db'
import { defineAPI, POST, PUT, DELETE } from 'rest-ts-core'

export class EditorGet {
  constructor (
    public readonly q: string | Record<string, any>,
    public readonly offset?: number,
    public readonly limit?: number,
    public readonly sort?: {
      key: string;
      desc?: boolean
    }
  ) {}
}

export class EditorGetResponse {
  constructor (
    public readonly data: Partial<IEntry>[],
    public readonly count: number
  ) {}
}

export class EditorCreate {
  constructor (
    public readonly create: IEntry[]
  ) {}
}

export class EditorUpdate {
  constructor (
    public readonly ids: string[],
    public readonly update: Partial<IEntry>
  ) {}
}

export class Id {
  constructor (
    public readonly id: string
  ) {}
}

export class Ids {
  constructor (
    public readonly ids: string[]
  ) {}
}

export class EditorEditTags {
  constructor (
    public readonly ids: string[],
    public readonly tags: string[]
  ) {}
}

const editorApiDefinition = defineAPI({
  get: POST`/`.body(EditorGet).response(EditorGetResponse),
  create: PUT`/create`.body(EditorCreate).response(Ids),
  update: PUT`/update`.body(EditorUpdate),
  delete: DELETE`/`.body(Ids),
  addTags: PUT`/tag`.body(EditorEditTags),
  removeTags: DELETE`/tag`.body(EditorEditTags)
})

export default editorApiDefinition
