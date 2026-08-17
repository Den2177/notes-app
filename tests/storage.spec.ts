import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA_VERSION, type Note } from '~/types/note'
import { clearDraft, installFlushOnHide, migrate, readDraft, readNotes, saveDraft, saveNotes } from '~/utils/storage'

const NOTES_KEY = 'notes-app:notes'
const DRAFT_KEY = 'notes-app:draft'

const makeNote = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  title: 'Список покупок',
  todos: [{ id: 't1', text: 'Молоко', done: false }],
  createdAt: 1000,
  updatedAt: 1000,
  ...over
})

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
})

afterEach(() => {
  saveNotes.cancel()
  saveDraft.cancel()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('чтение заметок', () => {
  it('на пустом хранилище отдаёт пустое состояние с актуальной версией', () => {
    expect(readNotes()).toEqual({ version: SCHEMA_VERSION, notes: [] })
  })

  it('не падает на битом JSON', () => {
    localStorage.setItem(NOTES_KEY, '{"version":1,"notes":[')
    expect(readNotes()).toEqual({ version: SCHEMA_VERSION, notes: [] })
  })

  it('прочитанное совпадает с записанным', () => {
    const notes = [makeNote(), makeNote({ id: 'n2', title: '' })]
    saveNotes(notes)
    vi.advanceTimersByTime(800)
    expect(readNotes().notes).toEqual(notes)
  })
})

describe('миграция', () => {
  it('пропускает данные текущей версии как есть', () => {
    const data = { version: SCHEMA_VERSION, notes: [makeNote()] }
    expect(migrate(data)).toEqual(data)
  })

  it('сбрасывает данные незнакомой версии', () => {
    expect(migrate({ version: 99, notes: [makeNote()] })).toEqual({ version: SCHEMA_VERSION, notes: [] })
  })

  it('сбрасывает данные без версии', () => {
    expect(migrate({ notes: [makeNote()] })).toEqual({ version: SCHEMA_VERSION, notes: [] })
  })

  it('сбрасывает состояние, если хотя бы одна заметка не той формы', () => {
    const raw = { version: SCHEMA_VERSION, notes: [makeNote(), { id: 'n2', title: 'Без todos' }] }
    expect(migrate(raw).notes).toEqual([])
  })

  it('сбрасывает состояние, если у пункта todo сломан тип поля', () => {
    const raw = { version: SCHEMA_VERSION, notes: [makeNote({ todos: [{ id: 't1', text: 'Молоко', done: 'yes' } as never] })] }
    expect(migrate(raw).notes).toEqual([])
  })

  it('на не-объекте отдаёт пустое состояние', () => {
    expect(migrate(null).notes).toEqual([])
    expect(migrate('[]').notes).toEqual([])
  })
})

describe('запись заметок', () => {
  it('откладывается на 800 мс, а не выполняется сразу', () => {
    saveNotes([makeNote()])
    expect(localStorage.getItem(NOTES_KEY)).toBeNull()
    vi.advanceTimersByTime(799)
    expect(localStorage.getItem(NOTES_KEY)).toBeNull()
    vi.advanceTimersByTime(1)
    expect(localStorage.getItem(NOTES_KEY)).not.toBeNull()
  })

  it('серия изменений подряд превращается в одну запись последнего состояния', () => {
    const setItem = vi.spyOn(localStorage, 'setItem')
    saveNotes([makeNote({ title: 'первое' })])
    vi.advanceTimersByTime(300)
    saveNotes([makeNote({ title: 'второе' })])
    vi.advanceTimersByTime(300)
    saveNotes([makeNote({ title: 'третье' })])
    vi.advanceTimersByTime(800)
    expect(setItem).toHaveBeenCalledOnce()
    expect(readNotes().notes[0]?.title).toBe('третье')
  })

  it('кладёт в хранилище version рядом с заметками', () => {
    saveNotes([makeNote()])
    saveNotes.flush()
    expect(JSON.parse(localStorage.getItem(NOTES_KEY) ?? '{}')).toMatchObject({ version: SCHEMA_VERSION })
  })

  it('flush пишет немедленно, не дожидаясь паузы', () => {
    saveNotes([makeNote()])
    saveNotes.flush()
    expect(readNotes().notes).toHaveLength(1)
  })
})

describe('черновик', () => {
  it('сохраняется с noteId и флагом новой заметки', () => {
    const note = makeNote()
    saveDraft(note.id, note, true)
    vi.advanceTimersByTime(500)
    expect(readDraft()).toMatchObject({ version: SCHEMA_VERSION, noteId: 'n1', isNew: true, note })
  })

  it('пишется через 500 мс, а не сразу', () => {
    const note = makeNote()
    saveDraft(note.id, note, false)
    expect(readDraft()).toBeNull()
    vi.advanceTimersByTime(500)
    expect(readDraft()).not.toBeNull()
  })

  it('после очистки не возвращается отложенной записью', () => {
    const note = makeNote()
    saveDraft(note.id, note, false)
    clearDraft()
    vi.advanceTimersByTime(500)
    expect(readDraft()).toBeNull()
  })

  it('черновик чужой версии не восстанавливается', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 99, noteId: 'n1', note: makeNote(), isNew: false, savedAt: 1 }))
    expect(readDraft()).toBeNull()
  })

  it('битый черновик не ломает чтение', () => {
    localStorage.setItem(DRAFT_KEY, '@@@')
    expect(readDraft()).toBeNull()
  })

  it('черновик без обязательного поля отбрасывается', () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: SCHEMA_VERSION, noteId: 'n1', isNew: false, savedAt: 1 }))
    expect(readDraft()).toBeNull()
  })
})

describe('принудительный сброс при уходе со страницы', () => {
  it('beforeunload дописывает отложенные заметки и черновик', () => {
    installFlushOnHide()
    const note = makeNote()
    saveNotes([note])
    saveDraft(note.id, note, false)
    window.dispatchEvent(new Event('beforeunload'))
    expect(readNotes().notes).toHaveLength(1)
    expect(readDraft()).not.toBeNull()
  })

  it('скрытие вкладки дописывает отложенные заметки', () => {
    installFlushOnHide()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    saveNotes([makeNote()])
    document.dispatchEvent(new Event('visibilitychange'))
    expect(readNotes().notes).toHaveLength(1)
  })
})
