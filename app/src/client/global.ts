import { remote } from 'electron'
import { createConsumer } from 'rest-ts-axios'
import axios from 'axios'
import editorApiDefinition from '@/api-definitions/editor'
import ioApiDefinition from '@/api-definitions/io'
import mediaApiDefinition from '@/api-definitions/media'
import quizApiDefinition from '@/api-definitions/quiz'

export const BASE_URL = `http://localhost:${remote.process.env.PORT || '48000'}`

export const editorApi = createConsumer(editorApiDefinition, axios.create({
  baseURL: `${BASE_URL}/api/editor`
}))

export const ioApi = createConsumer(ioApiDefinition, axios.create({
  baseURL: `${BASE_URL}/api/io`
}))

export const mediaApi = createConsumer(mediaApiDefinition, axios.create({
  baseURL: `${BASE_URL}/media`
}))

export const quizApi = createConsumer(quizApiDefinition, axios.create({
  baseURL: `${BASE_URL}/api/quiz`
}))

export interface IColumn {
  name: string;
  width?: number;
  label: string;
  type?: 'string' | 'html' | 'number' | 'datetime' | 'tag' | 'multiline';
  required?: boolean;
}

export const Columns: IColumn[] = [
  { name: 'deck', width: 150, type: 'string', required: true, label: 'Deck' },
  { name: 'front', width: 400, type: 'html', required: true, label: 'Front' },
  { name: 'back', width: 400, type: 'html', label: 'Back' },
  { name: 'mnemonic', width: 300, type: 'html', label: 'Mnemonic' },
  { name: 'tag', width: 150, type: 'tag', label: 'Tags' },
  { name: 'srsLevel', width: 150, type: 'number', label: 'SRS Level' },
  { name: 'nextReview', width: 250, type: 'datetime', label: 'Next Review' },
  { name: 'createdAt', width: 250, type: 'datetime', label: 'Created' },
  { name: 'updatedAt', width: 250, type: 'datetime', label: 'Updated' }
]

export const DateFormat = 'Y-M-d H:i'
