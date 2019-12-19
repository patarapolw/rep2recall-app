import fileUpload, { UploadedFile } from 'express-fileupload'
import uuid from 'uuid/v4'
import path from 'path'
import fs from 'fs'
import Anki from '../engine/anki'
import { g, UPLOAD_FOLDER, DB } from '../global'
import sanitize from 'sanitize-filename'
import Db from '../engine/db'
import rimraf from 'rimraf'
import { Record, String } from 'runtypes'
import { buildRouter } from 'rest-ts-express'
import ioApiDefinition from '@/api-definitions/io'

const router = buildRouter(ioApiDefinition, (_) => _
  .import(async (req) => {
    const id = uuid()
    const file = req.files!.file as UploadedFile
    const tmp = UPLOAD_FOLDER

    if (!fs.existsSync(tmp)) {
      fs.mkdirSync(tmp)
    }
    fs.writeFileSync(path.join(tmp, id), file.data)
    idToFilename[id] = file.name

    return { id }
  })
  .export(async (req, res) => {
    const { deck, reset } = req.body
    const fileId = sanitize(deck)

    rimraf.sync(path.join(UPLOAD_FOLDER, fileId))

    const xdb = new Db(path.join(UPLOAD_FOLDER, fileId), () => { })
    await xdb.init()
    DB.export({ $or: [{ deck }, { deck: { $like: `${deck}/%` } }] }, xdb)

    res.download(path.join(UPLOAD_FOLDER, fileId))
  })
)

router.use(fileUpload())

const idToFilename: { [key: string]: string } = {}

g.IO!.on('connection', (socket: any) => {
  socket.on('message', async (msg: any) => {
    const tmp = UPLOAD_FOLDER
    const { id, type } = Record({
      id: String,
      type: String
    }).check(msg)

    try {
      if (type === '.apkg') {
        const anki = new Anki(
          path.join(tmp, id),
          idToFilename[id],
          (p: any) => {
            g.IO!.send(p)
          }
        )

        await anki.export(DB)
        anki.close()
        g.IO!.send({})
      } else {
        const xdb = new Db(path.join(tmp, id), (p: any) => {
          g.IO!.send(p)
        })
        await xdb.init()
        xdb.export({}, DB)
        g.IO!.send({})
      }
    } catch (e) {
      g.IO!.send({
        error: e.toString()
      })
    }
  })
})

export default router
