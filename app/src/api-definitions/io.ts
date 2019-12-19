import { defineAPI, GET, PUT } from 'rest-ts-core'
import { Id } from './editor'

export class Export {
  constructor (
    public readonly deck: string,
    public readonly reset?: boolean
  ) {}
}

const ioApiDefinition = defineAPI({
  export: GET`/`.body(Export),
  import: PUT`/`.response(Id)
})

export default ioApiDefinition
