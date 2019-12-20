import { MEDIA_FOLDER, DB } from '../global'
import fs from 'fs'
import path from 'path'
import { buildRouter } from 'rest-ts-express'
import mediaApiDefinition from '@/api-definitions/media'

const router = buildRouter(mediaApiDefinition, (_) => _
  .get(async (req, res) => {
    const id = req.params[0]
    const m = (await DB.media.find({ _id: id }, ['data'], 'LIMIT 1'))[0]
    if (m) {
      res.send(m.data || '')
    } else {
      res.sendFile(path.join(MEDIA_FOLDER, req.params[0]))
    }
  })
  .path(async () => {
    return {
      folder: MEDIA_FOLDER
    }
  })
)

export default router
