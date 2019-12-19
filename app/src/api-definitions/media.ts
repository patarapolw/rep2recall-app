import { defineAPI, GET, POST } from 'rest-ts-core'

export class MediaFolder {
  constructor (
    public readonly folder: string
  ) {}
}

const mediaApiDefinition = defineAPI({
  get: GET`/*`,
  path: POST`/`.response(MediaFolder)
})

export default mediaApiDefinition
