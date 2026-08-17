import { SCHEMA_VERSION, type Note, type PersistedDraft, type PersistedNotes, type TodoItem } from '~/types/note'
import { debounce } from '~/utils/debounce'

const NOTES_KEY = 'notes-app:notes'
const DRAFT_KEY = 'notes-app:draft'
const NOTES_WRITE_MS = 800
const DRAFT_WRITE_MS = 500

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function isTodoItem(v: unknown): v is TodoItem {
  if (!isRecord(v)) return false
  return typeof v.id === 'string' && typeof v.text === 'string' && typeof v.done === 'boolean'
}

function isNote(v: unknown): v is Note {
  if (!isRecord(v)) return false
  return typeof v.id === 'string'
    && typeof v.title === 'string'
    && typeof v.createdAt === 'number'
    && typeof v.updatedAt === 'number'
    && Array.isArray(v.todos)
    && v.todos.every(isTodoItem)
}

function isPersistedNotes(v: unknown): v is PersistedNotes {
  if (!isRecord(v)) return false
  return typeof v.version === 'number' && Array.isArray(v.notes) && v.notes.every(isNote)
}

function isPersistedDraft(v: unknown): v is PersistedDraft {
  if (!isRecord(v)) return false
  return typeof v.version === 'number'
    && typeof v.noteId === 'string'
    && typeof v.isNew === 'boolean'
    && typeof v.savedAt === 'number'
    && isNote(v.note)
}

const emptyNotes = (): PersistedNotes => ({ version: SCHEMA_VERSION, notes: [] })

export const migrate = (raw: unknown): PersistedNotes => {
  if (!isRecord(raw)) return emptyNotes()
  const version = typeof raw.version === 'number' ? raw.version : -1
  switch (version) {
    case SCHEMA_VERSION:
      return isPersistedNotes(raw) ? raw : emptyNotes()
    default:
      // TODO: с появлением v2 сюда добавится case 1 с преобразованием формы, сейчас незнакомая версия просто сбрасывается
      return emptyNotes()
  }
}

export const readNotes = (): PersistedNotes => {
  const raw = localStorage.getItem(NOTES_KEY)
  if (!raw) return emptyNotes()
  try {
    return migrate(JSON.parse(raw))
  } catch {
    return emptyNotes()
  }
}

export const saveNotes = debounce((notes: Note[]) => {
  const payload: PersistedNotes = { version: SCHEMA_VERSION, notes }
  localStorage.setItem(NOTES_KEY, JSON.stringify(payload))
}, NOTES_WRITE_MS)

export const readDraft = (): PersistedDraft | null => {
  const raw = localStorage.getItem(DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isPersistedDraft(parsed) || parsed.version !== SCHEMA_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export const saveDraft = debounce((noteId: string, note: Note, isNew: boolean) => {
  const payload: PersistedDraft = { version: SCHEMA_VERSION, noteId, note, isNew, savedAt: Date.now() }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
}, DRAFT_WRITE_MS)

export const clearDraft = () => {
  // без cancel отложенная запись сработает после удаления и вернёт черновик к жизни
  saveDraft.cancel()
  localStorage.removeItem(DRAFT_KEY)
}

export const installFlushOnHide = () => {
  const flushAll = () => {
    saveNotes.flush()
    saveDraft.flush()
  }
  window.addEventListener('beforeunload', flushAll)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll()
  })
}
