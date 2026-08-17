import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HistoryOp, TextOp } from '~/types/history'
import type { Note } from '~/types/note'
import { debounce } from '~/utils/debounce'
import { applyOp, createHistory, revertOp } from '~/utils/history'
import { clearDraft, readDraft, saveDraft } from '~/utils/storage'
import { useNotesStore } from '~/stores/notes'

const blankNote = (): Note => {
  const now = Date.now()
  return { id: crypto.randomUUID(), title: '', todos: [], createdAt: now, updatedAt: now }
}

// сравниваем только то, что правит пользователь: расхождение по updatedAt само по себе не повод предлагать восстановление
const sameContent = (a: Note, b: Note) =>
  a.title === b.title
  && a.todos.length === b.todos.length
  && a.todos.every((todo, i) => {
    const other = b.todos[i]
    return !!other && todo.id === other.id && todo.text === other.text && todo.done === other.done
  })

export const useEditorStore = defineStore('editor', () => {
  const notes = useNotesStore()

  const note = ref<Note>(blankNote())
  const isNew = ref(false)
  const isActive = ref(false)
  const canUndo = ref(false)
  const canRedo = ref(false)

  const history = createHistory()

  const syncFlags = () => {
    canUndo.value = history.canUndo
    canRedo.value = history.canRedo
  }

  const persistDraft = () => saveDraft(note.value.id, note.value, isNew.value)

  const TEXT_PAUSE_MS = 500
  const pauseFlush = debounce(() => {
    history.flush()
    syncFlags()
  }, TEXT_PAUSE_MS)

  const flushText = () => {
    pauseFlush.cancel()
    history.flush()
    syncFlags()
  }

  const reset = () => {
    pauseFlush.cancel()
    history.reset()
    syncFlags()
  }

  const commit = (op: HistoryOp) => {
    applyOp(note.value, op)
    history.push(op)
    syncFlags()
    persistDraft()
  }

  const commitText = (op: TextOp) => {
    applyOp(note.value, op)
    history.pushText(op)
    pauseFlush()
    syncFlags()
    persistDraft()
  }

  const openNew = () => {
    note.value = blankNote()
    isNew.value = true
    isActive.value = true
    reset()
  }

  const openExisting = (source: Note) => {
    note.value = { ...source, todos: source.todos.map(t => ({ ...t })) }
    isNew.value = false
    isActive.value = true
    reset()
  }

  const pendingDraft = () => {
    const draft = readDraft()
    if (!draft) return null
    if (isNew.value) return draft.isNew ? draft.note : null
    if (draft.noteId !== note.value.id) return null
    const saved = notes.getById(note.value.id)
    if (!saved || sameContent(saved, draft.note)) return null
    return draft.note
  }

  const restoreDraft = (source: Note) => {
    note.value = { ...source, todos: source.todos.map(t => ({ ...t })) }
    // история в черновик не пишется, поэтому после восстановления стеки честно пустые
    reset()
  }

  const dismissDraft = () => clearDraft()

  const setTitle = (value: string) => {
    commitText({ type: 'title/set', before: note.value.title, after: value })
  }

  const setTodoText = (id: string, value: string) => {
    const todo = note.value.todos.find(t => t.id === id)
    if (!todo) return
    commitText({ type: 'todo/text', id, before: todo.text, after: value })
  }

  const toggleTodo = (id: string) => {
    const todo = note.value.todos.find(t => t.id === id)
    if (!todo) return
    commit({ type: 'todo/toggle', id, before: todo.done, after: !todo.done })
  }

  const addTodo = () => {
    const item = { id: crypto.randomUUID(), text: '', done: false }
    commit({ type: 'todo/add', index: note.value.todos.length, item })
  }

  const removeTodo = (id: string) => {
    const index = note.value.todos.findIndex(t => t.id === id)
    const todo = note.value.todos[index]
    if (!todo) return
    commit({ type: 'todo/remove', index, item: { ...todo } })
  }

  const blurTodo = (id: string) => {
    flushText()
    const todo = note.value.todos.find(t => t.id === id)
    if (!todo || todo.text.trim()) return
    removeTodo(id)
  }

  const undo = () => {
    const op = history.undo()
    pauseFlush.cancel()
    syncFlags()
    if (!op) return
    revertOp(note.value, op)
    persistDraft()
  }

  const redo = () => {
    const op = history.redo()
    pauseFlush.cancel()
    syncFlags()
    if (!op) return
    applyOp(note.value, op)
    persistDraft()
  }

  const save = () => {
    notes.save(note.value)
    isActive.value = false
    reset()
    clearDraft()
  }

  const saveAsNew = () => {
    note.value = { ...note.value, id: crypto.randomUUID(), createdAt: Date.now() }
    isNew.value = true
    save()
  }

  const discard = () => {
    isActive.value = false
    reset()
    clearDraft()
  }

  const removeNote = () => {
    notes.remove(note.value.id)
    isActive.value = false
    reset()
    clearDraft()
  }

  return {
    note,
    isNew,
    isActive,
    canUndo,
    canRedo,
    openNew,
    openExisting,
    pendingDraft,
    restoreDraft,
    dismissDraft,
    setTitle,
    setTodoText,
    toggleTodo,
    addTodo,
    removeTodo,
    blurTodo,
    flushText,
    undo,
    redo,
    save,
    saveAsNew,
    discard,
    removeNote
  }
})
