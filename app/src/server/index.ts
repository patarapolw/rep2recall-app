import express from 'express'
import { g, DB, PORT } from './global'
import editorRouter from './api/editor'
import mediaRouter from './api/media'
import quizRouter from './api/quiz'
import cors from 'cors'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
import http from 'http'
import fs from 'fs'
import path from 'path'

const app = express()
const server = new http.Server(app)
g.IO = SocketIO(server)

app.use(cors())

app.use(bodyParser.json())

app.use('/api/editor', editorRouter)
app.use('/api/io', require('./api/io').default)
app.use('/media', mediaRouter)
app.use('/api/quiz', quizRouter)

app.get('/reveal', (req, res) => {
  res.send(fs.readFileSync(
    process.env.NODE_ENV !== 'production'
      ? fs.readFileSync(path.normalize('../public/iframe.html'), 'utf8')
      : fs.readFileSync(path.join(__dirname, 'iframe.html'), 'utf8')
  ))
});

(async () => {
  await DB.init()
  server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
})().catch((e) => console.error(e))
