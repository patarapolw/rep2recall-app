import { DB } from '../global'
import { buildRouter } from 'rest-ts-express'
import editorApiDefinition from '@/api-definitions/editor'

const router = buildRouter(editorApiDefinition, (_) => _
  .get(async (req) => {
    const { q, offset, limit, sort } = req.body

    const [data, ids] = await Promise.all([
      DB.parseCond(q || {}, {
        offset,
        limit,
        fields: {
          card: ['front', 'back', 'mnemonic', 'tag', 'srsLevel', 'nextReview', 'createdAt', 'updatedAt', 'stat', 'deck', '_id'],
          template: ['name', 'front', 'back'],
          note: ['meta', 'data'],
          source: ['name']
        },
        sort
      }),
      DB.parseCond(q || {}, {
        fields: {
          card: ['_id']
        },
        sort
      })
    ])

    return {
      data,
      count: ids.length
    }
  })
  .create(async (req) => {
    const ids = await DB.insertMany(req.body.create)
    return { ids }
  })
  .update(async (req) => {
    const { ids, update } = req.body
    await DB.updateMany(ids, update)
  })
  .delete(async (req) => {
    const { ids } = req.body
    await DB.deleteMany(ids)
  })
  .addTags(async (req) => {
    const { ids, tags } = req.body
    for (const id of ids) {
      const c = (await DB.card.find({ _id: id }, ['tag'], 'LIMIT 1'))[0]
      if (c) {
        await DB.card.update({ _id: id }, { tag: [...(c.tag || []), ...tags] })
      }
    }
  })
  .removeTags(async (req) => {
    const { ids, tags } = req.body
    for (const id of ids) {
      const c = (await DB.card.find({ _id: id }, ['tag'], 'LIMIT 1'))[0]
      if (c) {
        await DB.card.update({ _id: id }, { tag: (c.tag || []).filter((t) => !tags.includes(t)) })
      }
    }
  })
)

export default router
