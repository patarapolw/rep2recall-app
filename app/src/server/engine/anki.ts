import fs from 'fs'
import AdmZip from 'adm-zip'
import path from 'path'
import Db, { IEntry } from './db'
import SparkMD5 from 'spark-md5'
import sqlite from 'sqlite'
import uuid4 from 'uuid/v4'

export default class Anki {
  private db!: sqlite.Database;
  private mediaNameToId: any = {};
  private filename: string;
  private filepath: string;
  private dir: string;
  private callback: (res: any) => any;

  constructor (filepath: string, filename: string, callback: (res: any) => any) {
    this.filename = filename
    this.filepath = filepath
    this.dir = path.dirname(filepath)
    this.callback = callback

    const zip = new AdmZip(filepath)
    const zipCount = zip.getEntries().length

    this.callback({
      text: `Unzipping Apkg. File count: ${zipCount}`,
      max: 0
    })

    zip.extractAllTo(this.dir)
  }

  public async export (dst: Db) {
    this.db = await sqlite.open(path.join(this.dir, 'collection.anki2'))

    this.callback({
      text: 'Preparing Anki resources.',
      max: 0
    })

    const { decks, models } = await this.db.get('SELECT decks, models FROM col')

    await this.db.run(`
    CREATE TABLE decks (
        id      INTEGER NOT NULL PRIMARY KEY,
        name    VARCHAR NOT NULL
    )`)

    let stmt = await this.db.prepare('INSERT INTO decks (id, name) VALUES (?, ?)')

    await Promise.all(Object.values(JSON.parse(decks as string)).map(async (deck: any) => {
      await stmt.run([deck.id, deck.name])
    }))

    await this.db.run(`
    CREATE TABLE models (
        id      INTEGER NOT NULL PRIMARY KEY,
        name    VARCHAR NOT NULL,
        flds    VARCHAR NOT NULL,
        css     VARCHAR
    )`)

    await this.db.run(`
    CREATE TABLE templates (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        mid     INTEGER REFERENCES model(id),
        name    VARCHAR NOT NULL,
        qfmt    VARCHAR NOT NULL,
        afmt    VARCHAR
    )`)

    const modelInsertStmt = await this.db.prepare('INSERT INTO models (id, name, flds, css) VALUES (?, ?, ?, ?)')
    const templateInsertStmt = await this.db.prepare('INSERT INTO templates (mid, name, qfmt, afmt) VALUES (?, ?, ?, ?)')

    await Promise.all(Object.values(JSON.parse(models as string)).map(async (model: any) => {
      await modelInsertStmt.run([model.id, model.name, model.flds.map((f: any) => f.name).join('\x1f'), model.css])
      await Promise.all(model.tmpls.map(async (t: any) => {
        await templateInsertStmt.run([model.id, t.name, t.qfmt, t.afmt])
      }))
    }))

    this.callback({
      text: 'Writing to database',
      max: 0
    })

    const sourceId = uuid4()
    const sourceH = SparkMD5.ArrayBuffer.hash(fs.readFileSync(this.filepath))
    try {
      await dst.source.create({
        _id: sourceId,
        name: this.filename,
        h: sourceH
      })
    } catch (e) {
      this.callback({
        error: `Duplicated resource: ${this.filename}`
      })
      return
    }

    this.mediaNameToId = {} as any

    const mediaJson = JSON.parse(fs.readFileSync(path.join(this.dir, 'media'), 'utf8'))

    await Promise.all(Object.keys(mediaJson).map(async (k, i) => {
      const data = fs.readFileSync(path.join(this.dir, k))
      const h = SparkMD5.ArrayBuffer.hash(data)
      const media = {
        sourceId,
        name: mediaJson[k],
        data,
        h
      }

      const total = Object.keys(mediaJson).length
      this.callback({
        text: 'Uploading media',
        current: i,
        max: total
      })

      let mediaId: string
      const m = (await dst.media.find({ h }, ['_id'], 'LIMIT 1'))[0]
      if (m) {
        mediaId = m._id!
      } else {
        mediaId = uuid4()
        await dst.media.create({
          _id: mediaId,
          ...media
        })
      }

      this.mediaNameToId[media.name] = mediaId
    }))

    await Promise.all((await this.db.all(`
    SELECT t.name AS tname, m.name AS mname, qfmt, afmt, css
    FROM templates AS t
    INNER JOIN models AS m ON m.id = t.mid`)).map(async (r) => {
      const _id = uuid4()
      const { tname, mname, qfmt, afmt, css } = r
      await dst.template.create({
        _id,
        name: `${mname}/${tname}`,
        front: this.convertLink(qfmt as string),
        back: this.convertLink(afmt as string),
        css: this.convertLink(css as string),
        sourceId
      })
    }))

    const { count } = (await this.db.get(`
    SELECT
      COUNT(*) AS count
    FROM cards AS c
    INNER JOIN decks AS d ON d.id = did
    INNER JOIN notes AS n ON n.id = nid
    INNER JOIN models AS m ON m.id = n.mid
    INNER JOIN templates AS t ON t.mid = n.mid`))

    const entries = [] as IEntry[]
    const frontSet = new Set()
    let current = 0;

    (await this.db.all(`
    SELECT
        n.flds AS "values",
        m.flds AS keys,
        t.name AS tname,
        m.name AS mname,
        d.name AS deck,
        qfmt,
        tags
    FROM cards AS c
    INNER JOIN decks AS d ON d.id = did
    INNER JOIN notes AS n ON n.id = nid
    INNER JOIN models AS m ON m.id = n.mid
    INNER JOIN templates AS t ON t.mid = n.mid`)).map((r) => {
      if (!(current % 1000)) {
        this.callback({
          text: 'Reading notes',
          current,
          max: count
        })
      }
      current++

      const { keys, values, tname, mname, deck, qfmt, tags } = r
      const vs = (values as string).split('\x1f')

      const data = {} as any
      const order = {} as any;
      (keys as string).split('\x1f').forEach((k, i) => {
        data[k] = vs[i]
        order[k] = i
      })

      let front = ankiMustache(qfmt as string, data)
      if (front === ankiMustache(qfmt as string)) {
        return
      }

      front = `@md5\n${SparkMD5.hash(this.convertLink(front))}`

      if (frontSet.has(front)) {
        return
      }
      frontSet.add(front)

      let tag = (tags as string).split(' ')
      tag = tag.filter((t, i) => t && tag.indexOf(t) === i)

      entries.push({
        deck: (deck as string).replace(/::/g, '/'),
        template: {
          name: `${mname}/${tname}`
        },
        note: {
          meta: { order },
          data
        },
        source: {
          h: sourceH
        },
        tag
      })
    });

    (() => {
      const batch = 1000
      const total = entries.length
      let subList = entries.splice(0, batch)
      let from = 0

      while (subList.length > 0) {
        this.callback({
          text: 'Uploading notes',
          current: from,
          max: total
        })

        dst.insertMany(subList)
        subList = entries.splice(0, batch)
        from += batch
      }
    })()
  }

  public close () {
    fs.unlinkSync(this.filepath)
    this.callback({})
    this.db.close()
  }

  private convertLink (s: string) {
    return s.replace(/(?:(?:href|src)=")([^"]+)(?:")/, (m, p1) => {
      return `/media/${this.mediaNameToId[p1]}`
    })
  }
}

export function ankiMustache (s: string, d?: Record<string, any>, front: string = ''): string {
  d = d || []
  s = s.replace(/{{FrontSide}}/g, front.replace(/@html\n/g, ''))

  for (const [k, v] of Object.entries(d)) {
    s = s.replace(
      new RegExp(`{{(\\S+:)?${escapeRegExp(k)}}}`, 'g'),
      v.replace(/^@[^\n]+\n/gs, '')
    )
  }

  const keys = Object.keys(d)

  s = s.replace(/{{#(\S+)}}([^]*){{\1}}/gs, (m, p1, p2) => {
    return keys.includes(p1) ? p2 : ''
  })

  s = s.replace(/{{[^}]+}}/g, '')

  return s
}

function escapeRegExp (s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
