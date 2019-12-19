import path from 'path'
import Db from './engine/db'
import SocketIO from 'socket.io'
import rimraf from 'rimraf'
import fs from 'fs-extra'
import DEFAULTS from '../defaults.json'
import { app } from 'electron'

export const PORT = process.env.PORT || DEFAULTS.port
export const COLLECTION = process.env.COLLECTION || path.join(app.getPath('userData'), 'rep2recall', 'user.db')
export const MEDIA_FOLDER = path.join(path.dirname(COLLECTION), 'media')
export const UPLOAD_FOLDER = path.join(path.dirname(COLLECTION), 'upload')

fs.ensureDirSync(MEDIA_FOLDER)
fs.ensureDirSync(UPLOAD_FOLDER)

export const DB = new Db(COLLECTION)

export const g: {
  IO?: SocketIO.Server
} = {}

function onExit () {
  rimraf.sync(UPLOAD_FOLDER)
  process.exit()
}

process.on('exit', onExit)
process.on('SIGINT', onExit)
