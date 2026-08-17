import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SCHEMA_VERSION, type Note } from '~/types/note'
import { readDraft, saveDraft, saveNotes } from '~/utils/storage'
import { useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

const NOTES_KEY = 'notes-app:notes'
const DRAFT_KEY = 'notes-app:draft'

const stored: Note = {
  id: 'n1',
  title: 'Дела',
  todos: [{ id: 't1', text: 'Молоко', done: false }],
  createdAt: 1000,
  updatedAt: 1000
}

const seedNotes = (notes: Note[]) => {
  localStorage.setItem(NOTES_KEY, JSON.stringify({ version: SCHEMA_VERSION, notes }))
}

const seedDraft = (noteId: string, note: Note, isNew: boolean) => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: SCHEMA_VERSION, noteId, note, isNew, savedAt: 1 }))
}

const openNew = () => {
  const editor = useEditorStore()
  editor.openNew()
  return editor
}

const openStored = () => {
  const editor = useEditorStore()
  editor.openExisting(stored)
  return editor
}

const firstTodoId = (editor: ReturnType<typeof useEditorStore>) => editor.note.todos[0]!.id

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(5000)
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  saveNotes.cancel()
  saveDraft.cancel()
  vi.useRealTimers()
})

describe('открытие редактора', () => {
  it('новая заметка получает id сразу, но в списке её ещё нет', () => {
    const notes = useNotesStore()
    const editor = openNew()
    expect(editor.note.id).toBeTruthy()
    expect(editor.note).toMatchObject({ title: '', todos: [] })
    expect(editor.isNew).toBe(true)
    expect(editor.isActive).toBe(true)
    expect(notes.notes).toEqual([])
  })

  it('существующая заметка правится на копии и список не меняется до сохранения', () => {
    seedNotes([stored])
    const notes = useNotesStore()
    const editor = openStored()
    editor.setTitle('Покупки')
    editor.setTodoText('t1', 'Кефир')
    editor.toggleTodo('t1')

    expect(notes.notes[0]).toMatchObject({ title: 'Дела' })
    expect(notes.notes[0]?.todos[0]).toMatchObject({ text: 'Молоко', done: false })
  })
})

describe('пункты todo', () => {
  it('добавление, правка текста, отметка и удаление доходят до заметки', () => {
    const editor = openNew()
    editor.addTodo()
    const id = firstTodoId(editor)
    editor.setTodoText(id, 'Молоко')
    editor.toggleTodo(id)
    expect(editor.note.todos[0]).toMatchObject({ text: 'Молоко', done: true })

    editor.removeTodo(id)
    expect(editor.note.todos).toEqual([])
  })

  it('каждое действие с пунктом отменяется отдельным шагом', () => {
    const editor = openNew()
    editor.addTodo()
    const id = firstTodoId(editor)
    editor.setTodoText(id, 'Молоко')
    editor.flushText()
    editor.toggleTodo(id)

    editor.undo()
    expect(editor.note.todos[0]).toMatchObject({ text: 'Молоко', done: false })
    editor.undo()
    expect(editor.note.todos[0]?.text).toBe('')
    editor.undo()
    expect(editor.note.todos).toEqual([])
    expect(editor.canUndo).toBe(false)
  })

  it('удалённый пункт возвращается на своё место', () => {
    seedNotes([stored])
    const editor = openStored()
    editor.addTodo()
    editor.setTodoText(firstTodoId(editor), 'первый')
    editor.flushText()

    editor.removeTodo('t1')
    expect(editor.note.todos.map(t => t.id)).toEqual([editor.note.todos[0]!.id])
    editor.undo()
    expect(editor.note.todos.map(t => t.text)).toEqual(['первый', ''])
  })

  it('redo возвращает отменённое действие', () => {
    const editor = openNew()
    editor.addTodo()
    editor.undo()
    expect(editor.note.todos).toEqual([])
    editor.redo()
    expect(editor.note.todos).toHaveLength(1)
    expect(editor.canRedo).toBe(false)
  })
})

describe('коалесинг ввода', () => {
  it('непрерывный набор откатывается одним undo', () => {
    const editor = openNew()
    editor.setTitle('Д')
    editor.setTitle('Де')
    editor.setTitle('Дела')
    editor.undo()
    expect(editor.note.title).toBe('')
  })

  it('пауза в 500 мс разрывает серию на две записи', () => {
    const editor = openNew()
    editor.setTitle('Д')
    editor.setTitle('Де')
    vi.advanceTimersByTime(500)
    editor.setTitle('Дела')
    vi.advanceTimersByTime(500)

    editor.undo()
    expect(editor.note.title).toBe('Де')
    editor.undo()
    expect(editor.note.title).toBe('')
  })
})

describe('пустой пункт', () => {
  it('удаляется на blur и возвращается через undo', () => {
    const editor = openNew()
    editor.addTodo()
    const id = firstTodoId(editor)
    editor.blurTodo(id)
    expect(editor.note.todos).toEqual([])

    editor.undo()
    expect(editor.note.todos[0]?.id).toBe(id)
  })

  it('пункт из одних пробелов тоже считается пустым', () => {
    const editor = openNew()
    editor.addTodo()
    const id = firstTodoId(editor)
    editor.setTodoText(id, '   ')
    editor.blurTodo(id)
    expect(editor.note.todos).toEqual([])
  })

  it('заполненный пункт на blur остаётся', () => {
    const editor = openNew()
    editor.addTodo()
    const id = firstTodoId(editor)
    editor.setTodoText(id, 'Молоко')
    editor.blurTodo(id)
    expect(editor.note.todos).toHaveLength(1)
  })

  it('после стирания текста первый undo возвращает пункт, второй — текст', () => {
    const editor = openNew()
    editor.addTodo()
    const id = firstTodoId(editor)
    editor.setTodoText(id, 'Молоко')
    editor.flushText()
    editor.setTodoText(id, '')
    editor.blurTodo(id)

    editor.undo()
    expect(editor.note.todos[0]?.text).toBe('')
    editor.undo()
    expect(editor.note.todos[0]?.text).toBe('Молоко')
  })
})

describe('сохранение, отмена, удаление', () => {
  it('сохранение кладёт заметку в список, сбрасывает историю и убирает черновик', () => {
    const notes = useNotesStore()
    const editor = openNew()
    editor.setTitle('  Дела  ')
    vi.advanceTimersByTime(500)
    expect(readDraft()).not.toBeNull()

    editor.save()
    expect(notes.notes[0]).toMatchObject({ title: 'Дела' })
    expect(editor.canUndo).toBe(false)
    expect(editor.canRedo).toBe(false)
    expect(editor.isActive).toBe(false)
    expect(readDraft()).toBeNull()
  })

  it('отмена редактирования не трогает список и убирает черновик', () => {
    seedNotes([stored])
    const notes = useNotesStore()
    const editor = openStored()
    editor.setTitle('Покупки')
    vi.advanceTimersByTime(500)

    editor.discard()
    expect(notes.notes[0]).toMatchObject({ title: 'Дела' })
    expect(readDraft()).toBeNull()
    expect(editor.canUndo).toBe(false)
  })

  it('удаление убирает заметку из списка', () => {
    seedNotes([stored])
    const notes = useNotesStore()
    openStored().removeNote()
    expect(notes.notes).toEqual([])
    expect(readDraft()).toBeNull()
  })
})

describe('черновик', () => {
  it('пишется через 500 мс после изменения', () => {
    const editor = openNew()
    editor.setTitle('Дела')
    expect(readDraft()).toBeNull()
    vi.advanceTimersByTime(500)
    expect(readDraft()).toMatchObject({ noteId: editor.note.id, isNew: true })
  })

  it('без черновика восстанавливать нечего', () => {
    seedNotes([stored])
    expect(openStored().pendingDraft()).toBeNull()
  })

  it('черновик, совпадающий по содержанию, не предлагается', () => {
    seedNotes([stored])
    seedDraft('n1', { ...stored, updatedAt: 99999 }, false)
    expect(openStored().pendingDraft()).toBeNull()
  })

  it('отличающийся черновик предлагается и восстанавливается с пустой историей', () => {
    seedNotes([stored])
    seedDraft('n1', { ...stored, title: 'Покупки' }, false)
    const editor = openStored()
    const draft = editor.pendingDraft()
    expect(draft?.title).toBe('Покупки')

    editor.restoreDraft(draft!)
    expect(editor.note.title).toBe('Покупки')
    expect(editor.canUndo).toBe(false)
    expect(editor.canRedo).toBe(false)
  })

  it('черновик от другой заметки не предлагается', () => {
    seedNotes([stored])
    seedDraft('n2', { ...stored, id: 'n2', title: 'Другая' }, false)
    expect(openStored().pendingDraft()).toBeNull()
  })

  it('на новой заметке черновик подхватывается по флагу isNew', () => {
    seedDraft('n9', { ...stored, id: 'n9', title: 'Недописанная' }, true)
    expect(openNew().pendingDraft()?.title).toBe('Недописанная')
  })

  it('на новой заметке черновик существующей заметки игнорируется', () => {
    seedDraft('n1', stored, false)
    expect(openNew().pendingDraft()).toBeNull()
  })

  it('отказ от восстановления удаляет черновик', () => {
    seedNotes([stored])
    seedDraft('n1', { ...stored, title: 'Покупки' }, false)
    const editor = openStored()
    editor.dismissDraft()
    expect(readDraft()).toBeNull()
    expect(editor.pendingDraft()).toBeNull()
  })
})

describe('изменения из другой вкладки', () => {
  it('событие storage перечитывает список', () => {
    seedNotes([stored])
    const notes = useNotesStore()
    expect(notes.notes).toHaveLength(1)

    seedNotes([])
    window.dispatchEvent(new StorageEvent('storage', { key: NOTES_KEY }))
    expect(notes.notes).toEqual([])
  })

  it('посторонний ключ игнорируется', () => {
    seedNotes([stored])
    const notes = useNotesStore()
    seedNotes([])
    window.dispatchEvent(new StorageEvent('storage', { key: 'что-то-ещё' }))
    expect(notes.notes).toHaveLength(1)
  })

  it('пропавшую заметку можно сохранить как новую, не потеряв правки', () => {
    seedNotes([stored])
    const notes = useNotesStore()
    const editor = openStored()
    editor.setTitle('Спасённая')

    seedNotes([])
    window.dispatchEvent(new StorageEvent('storage', { key: NOTES_KEY }))
    expect(notes.getById('n1')).toBeUndefined()

    editor.saveAsNew()
    expect(notes.notes).toHaveLength(1)
    expect(notes.notes[0]).toMatchObject({ title: 'Спасённая', createdAt: 5000 })
    expect(notes.notes[0]?.id).not.toBe('n1')
    expect(readDraft()).toBeNull()
  })
})
