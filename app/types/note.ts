export const SCHEMA_VERSION = 1 as const

export interface TodoItem {
  id: string
  text: string
  done: boolean
}

export interface Note {
  id: string
  title: string
  todos: TodoItem[]
  createdAt: number
  updatedAt: number
}

export interface PersistedNotes {
  version: number
  notes: Note[]
}

export interface PersistedDraft {
  version: number
  noteId: string
  note: Note
  isNew: boolean
  savedAt: number
}
