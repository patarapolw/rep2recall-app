import SparkMD5 from 'spark-md5'
import { Db as LiteDb, Table, primary, prop, Collection } from 'liteorm'
import uuid4 from 'uuid/v4'
import stringify from 'es6-json-stable-stringify'
import moment from 'moment'
import dotProp from 'dot-prop'
import { ankiMustache } from './anki'
import { srsMap, getNextReview, repeatReview } from './quiz'

@Table({ timestamp: true })
export class DbSource {
  @primary() _id!: string;
  @prop() name!: string;
  @prop({ unique: true, null: true }) h?: string;
}

@Table({ unique: [['sourceId', 'name']] })
export class DbTemplate {
  @primary() _id!: string;
  @prop({ references: 'source(id)', null: true }) sourceId?: string;
  @prop() name!: string;
  @prop() front!: string;
  @prop({ null: true }) back?: string;
  @prop({ null: true }) css?: string;
  @prop({ null: true }) js?: string;
}

@Table()
export class DbNote {
  @primary() _id!: string;
  @prop({ references: 'source(id)', null: true }) sourceId?: string;
  @prop({ default: '{}' }) meta?: Record<string, any>;
  @prop() data!: Record<string, any>;
  @prop({ null: true, unique: true }) h?: string;
}

@Table()
export class DbMedia {
  @primary() _id!: string;
  @prop({ references: 'source(id)', null: true }) sourceId?: string;
  @prop({ default: '{}' }) meta?: Record<string, any>;
  @prop() data!: ArrayBuffer;
  @prop({ null: true, unique: true }) h?: string;
}

@Table({ timestamp: true })
export class DbCard {
  @primary() _id!: string;
  @prop() deck!: string;
  @prop({ references: 'template(id)', null: true }) templateId?: string;
  @prop({ references: 'note(id)', null: true }) noteId?: string;
  @prop({ null: true }) front?: string;
  @prop({ null: true }) back?: string;
  @prop({ null: true }) mnemonic?: string;
  @prop({ type: 'integer', null: true }) srsLevel?: number;
  @prop({ null: true }) nextReview?: Date;
  @prop({ type: 'StrArray', null: true }) tag?: string[];
  @prop({ default: {} }) stat?: Record<string, any>;
}

export interface IEntry {
  _id?: string;
  deck: string;
  front?: string;
  back?: string;
  mnemonic?: string;
  srsLevel?: number;
  nextReview?: string | Date;
  tag?: string[];
  stat?: Record<string, any>;
  template?: {
    name: string;
    front?: string;
    back?: string;
    css?: string;
    js?: string;
  }
  note?: {
    meta?: Record<string, any>;
    data: Record<string, any>;
  }
  source?: {
    name?: string;
    h: string;
  }
}

interface ICondOptions {
  offset?: number;
  limit?: number;
  sort?: {
    key: string;
    desc?: boolean;
  }
  fields?: Record<string, string[]>;
}

interface IPagedOutput<T> {
  data: T[];
  count: number;
}

export default class Db {
  db!: LiteDb;
  source!: Collection<DbSource>;
  template!: Collection<DbTemplate>;
  media!: Collection<DbMedia>;
  note!: Collection<DbNote>;
  card!: Collection<DbCard>;

  constructor(
    public filename: string,
    public callback?: (res: any) => any
  ) { }

  async init() {
    this.db = await LiteDb.connect(this.filename)
    this.source = await this.db.collection('source', new DbSource())
    this.template = await this.db.collection('template', new DbTemplate())
    this.media = await this.db.collection('media', new DbMedia())
    this.note = await this.db.collection('note', new DbNote())
    this.card = await this.db.collection('card', new DbCard())
  }

  async export(cond: Record<string, any>, dst: Db) {
    await Promise.all((await this.source.find(cond)).map(async (s) => {
      await dst.source.create(s as DbSource)
    }))

    await Promise.all((await this.media.find(cond)).map(async (s) => {
      await dst.media.create(s as DbMedia)
    }))

    const data = await this.parseCond(cond) as IEntry[]
    await dst.insertMany(data)
  }

  async insertMany(entries: IEntry[]): Promise<string[]> {
    const sourceHToId: { [key: string]: string } = {}

    for (const e of entries.filter((e) => e.source)) {
      if (e.source && e.source.h && !sourceHToId[e.source.h]) {
        let _id: string

        const s = (await this.source.find({ h: e.source.h }, ['_id'], 'LIMIT 1'))[0]
        if (s) {
          _id = s._id!
        } else {
          _id = uuid4()
          await this.source.create({
            _id,
            name: e.source.name!,
            h: e.source.h
          })
        }

        sourceHToId[e.source.h] = _id
      }
    }

    const templateKeyToId: { [key: string]: string } = {}
    for (const e of entries.filter((e) => e.template)) {
      const t = e.template!

      if (!templateKeyToId[t.name]) {
        const sourceId = e.source && e.source.h ? sourceHToId[e.source.h] : undefined
        let _id: string

        const t1 = (await this.template.find({ sourceId, name: t.name }, ['_id'], 'LIMIT 1'))[0]
        if (t1) {
          _id = t1._id!
        } else {
          _id = uuid4()
          await this.template.create({
            _id,
            sourceId,
            front: t.front!,
            ...t
          })
        }

        templateKeyToId[t.name] = _id
      }
    }

    const noteKeyToId: { [key: string]: string } = {}
    for (const e of entries.filter((el) => el.note)) {
      const n = e.note!
      const h = hashObj(n.data)
      const sourceId = e.source && e.source.h ? sourceHToId[e.source.h] : undefined

      if (!noteKeyToId[h]) {
        let _id: string

        const n1 = (await this.note.find({ h }, ['_id'], 'LIMIT 1'))[0]
        if (n1) {
          _id = n1._id!
        } else {
          _id = uuid4()
          await this.note.create({
            _id,
            sourceId,
            h,
            ...n
          })
        }

        noteKeyToId[h] = _id
      }
    }

    const now = new Date()
    const cardIds: string[] = []

    for (const e of entries) {
      const _id = uuid4()
      await this.card.create({
        _id,
        deck: e.deck,
        noteId: e.note ? noteKeyToId[hashObj(e.note.data)] : undefined,
        templateId: e.template ? templateKeyToId[e.template.name] : undefined,
        front: e.front,
        back: e.back,
        mnemonic: e.mnemonic,
        srsLevel: e.srsLevel,
        nextReview: e.nextReview ? moment(e.nextReview).toDate() : undefined,
        tag: e.tag,
        stat: e.stat,
        // @ts-ignore
        createdAt: now
      })

      cardIds.push(_id)
    }

    return cardIds
  }

  async parseCond(
    cond: string | Record<string, any>,
    options: ICondOptions = {}
  ): Promise<Partial<IEntry>[]> {
    if (typeof cond === 'string') {
      cond = parseQ(cond)
    }

    const joinCond: Record<string, any> = {}
    for (const [k, v] of Object.entries(cond)) {
      if (k === 'tFront') {
        joinCond.template__front = v
      } else if (k === 'tBack') {
        joinCond.template__back = v
      } else if (k.startsWith('data.')) {
        joinCond[`note__${k}`] = v
      } else if (k === 'tag') {
        if (typeof v === 'string') {
          joinCond.tag = { $like: `\x1f${v}\x1f` }
        } else {
          joinCond.tag = v
        }
      } else {
        joinCond[k] = v
      }
    }

    let postfix = ''
    if (options.sort) {
      postfix += `ORDER BY ${options.sort.key} ${options.sort.desc ? 'DESC' : 'ASC'} `
    }

    if (options.offset) {
      postfix += `OFFSET ${options.offset} `
    }

    if (options.limit) {
      postfix += `LIMIT ${options.limit} `
    }

    const data = await this.card.chain(dotProp.get(options, 'fields.card'))
      .join(this.template, 'templateId', '_id', dotProp.get(options, 'fields.template'), "left")
      .join(this.note, 'noteId', '_id', dotProp.get(options, 'fields.note'), "left")
      .join(this.source, 'note.sourceId', '_id', dotProp.get(options, 'fields.source'), "left")
      .data(joinCond, postfix)

    return data.map((d) => {
      return {
        ...d.card,
        note: d.note as any,
        template: d.template as any,
        source: d.source as any
      }
    })
  }

  async updateMany(ids: string[], u: Partial<IEntry>) { }

  async render(id: string) {
    const r = (await this.parseCond({
      _id: id
    }, {
      limit: 1,
      fields: {
        card: ['front', 'back', 'mnemonic'],
        template: ['front', 'back', 'css', 'js'],
        note: ['data']
      }
    }))[0]

    if (r) {
      let front = r.front
      let back = r.back
      const mnemonic = r.mnemonic
      const css = dotProp.get(r, 'template.css')
      const js = dotProp.get(r, 'template.js')

      if (front === undefined && r.template && r.template.front) {
        front = ankiMustache(r.template.front, dotProp.get(r, 'note.data'))
      }

      if (back === undefined && r.template && r.template.back) {
        back = ankiMustache(r.template.back, dotProp.get(r, 'note.data'), front)
      }

      return { front, back, mnemonic, css, js }
    }

    return {} as any
  }

  async markRight(cardId: string) {
    return this.updateSrsLevel(+1, cardId)
  }

  async markWrong(cardId: string) {
    return this.updateSrsLevel(-1, cardId)
  }

  async updateSrsLevel(dSrsLevel: number, cardId: string) {
    const card = (await this.card.find({ _id: cardId }, ['srsLevel', 'stat'], 'LIMIT 1'))[0]

    if (!card) {
      return
    }

    card.srsLevel = card.srsLevel || 0
    card.stat = card.stat || {
      streak: {
        right: 0,
        wrong: 0
      }
    }
    card.stat.streak = card.stat.streak || {
      right: 0,
      wrong: 0
    }

    if (dSrsLevel > 0) {
      card.stat.streak.right = (card.stat.streak.right || 0) + 1
    } else if (dSrsLevel < 0) {
      card.stat.streak.wrong = (card.stat.streak.wrong || 0) + 1
    }

    card.srsLevel += dSrsLevel

    if (card.srsLevel >= srsMap.length) {
      card.srsLevel = srsMap.length - 1
    }

    if (card.srsLevel < 0) {
      card.srsLevel = 0
    }

    if (dSrsLevel > 0) {
      card.nextReview = getNextReview(card.srsLevel)
    } else {
      card.nextReview = repeatReview()
    }

    const { srsLevel, stat, nextReview } = card
    await this.card.update({
      _id: cardId
    }, { srsLevel, stat, nextReview })
  }

  async deleteMany(ids: string[]) {
    while (ids.length > 0) {
      const chunk = ids.splice(0, 900)
      this.db.cols.card.delete({
        ids: { $in: chunk }
      })
    }
  }
}

function hashObj(o: any) {
  return SparkMD5.hash(stringify(o))
}

export function parseQ(q: string): Record<string, any> {
  const cond: Record<string, any> = {}
  let newQ = q
  const fullRegex = /([A-Z_.])(:|=|<=?|>=?)([^ ]+|"[^"]+"|'[^']+')/gi
  let m: RegExpExecArray | null = null
  while (m = fullRegex.exec(q)) {
    let [all, k, op, v] = m
    newQ = newQ.replace(all, '')

    if (v[0] === v[v.length - 1] && /["']/.test(v[0])) {
      v = v.substr(1, v.length - 2)
    }

    if (k === 'tag') {
      if (op === '=') {
        cond[k] = { $like: `%\x1f${v}\x1f%` }
      } else {
        cond[k] = { $like: `%${v}%` }
      }
    } else if (k === 'srsLevel') {
      const vNum = parseInt(v)
      switch (op) {
        case '>': cond[k] = { $gt: vNum }; break
        case '>=': cond[k] = { $gte: vNum }; break
        case '<': cond[k] = { $lt: vNum }; break
        case '<=': cond[k] = { $lte: vNum }; break
        default: cond[k] = vNum
      }
    } else if (k === 'nextReview') {
      let vCmp = v

      try {
        const r = /([-+])(\d+(?:\.\d+)?)([A-Z]+)/i.exec(v)
        if (r) {
          const [_, neg, amount, unit] = r
          vCmp = moment().add((neg ? -1 : 1) * parseFloat(amount), unit as any).toISOString()
        }
      } catch (e) {
        console.error(e)
      }

      switch (op) {
        case '>': cond[k] = { $gt: vCmp }; break
        case '>=': cond[k] = { $gte: vCmp }; break
        case '<': cond[k] = { $lt: vCmp }; break
        case '<=': cond[k] = { $lte: vCmp }; break
        default: cond[k] = { $gt: vCmp }
      }
    } else {
      cond[k] = { $like: `%${v}%` }
    }
  }

  newQ.split(' ').filter((seg) => seg).forEach((seg) => {
    cond.tag = cond.tag || { $like: `%${seg}%` }
    cond.deck = cond.deck || { $like: `%${seg}%` }
  })

  return cond
}
