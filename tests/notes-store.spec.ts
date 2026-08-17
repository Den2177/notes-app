import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA_VERSION, type Note } from '~/types/note'
import { readNotes, saveNotes } from '~/utils/storage'
import { useNotesStore } from '~/stores/notes'

const NOTES_KEY = 'notes-app:notes'

const makeNote = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  title: 'Список покупок',
  todos: [{ id: 't1', text: 'Молоко', done: false }],
  createdAt: 1000,
  updatedAt: 1000,
  ...over
})

const seed = (notes: Note[]) => {
  localStorage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION, notes }))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(5000)
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  saveNotes.cancel()
  vi.useRealTimers()
})

describe('инициализация', () => {
  it('на пустом хранилище список пустой', () => {
    expect(useNotesStore().notes).toEqual([])
  })

  it('поднимает сохранённые заметки', () => {
    seed([makeNote(), makeNote({ id: 'n2' })])
    expect(useNotesStore().notes.map(n => n.id)).toEqual(['n1', 'n2'])
  })

  it('битые данные дают пустой список, а не исключение', () => {
    localStorage.setItem(NOTES_KEY, 'не json')
    expect(useNotesStore().notes).toEqual([])
  })

  it('данные незнакомой версии не поднимаются', () => {
    localStorage.setItem(NOTES_KEY, JSON.stringify({ version: 99, notes: [makeNote()] }))
    expect(useNotesStore().notes).toEqual([])
  })
})

describe('сохранение заметки', () => {
  it('новая заметка встаёт в начало списка', () => {
    seed([makeNote({ id: 'n1' })])
    const store = useNotesStore()
    store.save(makeNote({ id: 'n2', title: 'Новая' }))
    expect(store.notes.map(n => n.id)).toEqual(['n2', 'n1'])
  })

  it('существующая заменяется на месте и не прыгает наверх', () => {
    seed([makeNote({ id: 'n1' }), makeNote({ id: 'n2' })])
    const store = useNotesStore()
    store.save(makeNote({ id: 'n2', title: 'Переименовал' }))
    expect(store.notes.map(n => n.id)).toEqual(['n1', 'n2'])
    expect(store.notes[1]?.title).toBe('Переименовал')
  })

  it('название тримится', () => {
    const store = useNotesStore()
    store.save(makeNote({ title: '   Дела   ' }))
    expect(store.notes[0]?.title).toBe('Дела')
  })

  it('пустое название сохраняется как есть, без подстановки заглушки', () => {
    const store = useNotesStore()
    store.save(makeNote({ title: '   ' }))
    expect(store.notes[0]?.title).toBe('')
  })

  it('обновляет updatedAt и не трогает createdAt', () => {
    const store = useNotesStore()
    store.save(makeNote({ createdAt: 1000, updatedAt: 1000 }))
    expect(store.notes[0]).toMatchObject({ createdAt: 1000, updatedAt: 5000 })
  })

  it('возвращает сохранённую копию', () => {
    const store = useNotesStore()
    const stored = store.save(makeNote({ title: ' Дела ' }))
    expect(stored).toMatchObject({ id: 'n1', title: 'Дела', updatedAt: 5000 })
  })

  it('список не меняется, если после сохранения править исходный объект', () => {
    const store = useNotesStore()
    const note = makeNote()
    store.save(note)
    note.title = 'подменили'
    note.todos[0]!.text = 'подменили'
    note.todos.push({ id: 't2', text: 'лишний', done: false })
    expect(store.notes[0]?.title).toBe('Список покупок')
    expect(store.notes[0]?.todos).toEqual([{ id: 't1', text: 'Молоко', done: false }])
  })
})

describe('поиск и удаление', () => {
  it('находит заметку по id', () => {
    seed([makeNote({ id: 'n1' }), makeNote({ id: 'n2', title: 'Вторая' })])
    const store = useNotesStore()
    expect(store.getById('n2')?.title).toBe('Вторая')
  })

  it('на неизвестный id отдаёт undefined', () => {
    expect(useNotesStore().getById('нет-такой')).toBeUndefined()
  })

  it('удаляет только указанную заметку', () => {
    seed([makeNote({ id: 'n1' }), makeNote({ id: 'n2' }), makeNote({ id: 'n3' })])
    const store = useNotesStore()
    store.remove('n2')
    expect(store.notes.map(n => n.id)).toEqual(['n1', 'n3'])
  })
})

describe('персист', () => {
  it('запись откладывается, а не выполняется на каждое изменение', () => {
    const store = useNotesStore()
    store.save(makeNote())
    store.save(makeNote({ id: 'n2' }))
    expect(localStorage.getItem(NOTES_KEY)).toBeNull()
    vi.advanceTimersByTime(800)
    expect(readNotes().notes).toHaveLength(2)
  })

  it('сохранённое поднимается новым стором после перезагрузки', () => {
    useNotesStore().save(makeNote({ title: 'Дела' }))
    vi.advanceTimersByTime(800)

    setActivePinia(createPinia())
    const reloaded = useNotesStore()
    expect(reloaded.notes).toHaveLength(1)
    expect(reloaded.notes[0]).toMatchObject({ title: 'Дела', updatedAt: 5000 })
  })

  it('удаление тоже доезжает до хранилища', () => {
    seed([makeNote({ id: 'n1' }), makeNote({ id: 'n2' })])
    useNotesStore().remove('n1')
    vi.advanceTimersByTime(800)
    expect(readNotes().notes.map(n => n.id)).toEqual(['n2'])
  })
})
