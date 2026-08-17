import type { HistoryManager, HistoryOp, TextOp } from '~/types/history'
import type { Note } from '~/types/note'

const HISTORY_LIMIT = 50

const findTodo = (note: Note, id: string) => note.todos.find(t => t.id === id)

export const applyOp = (note: Note, op: HistoryOp): void => {
  switch (op.type) {
    case 'title/set':
      note.title = op.after
      return
    case 'todo/add':
      // вставляем копию: в истории лежат данные, а не ссылки на живые пункты, иначе запись меняется вместе с заметкой
      note.todos.splice(op.index, 0, { ...op.item })
      return
    case 'todo/remove':
      note.todos.splice(op.index, 1)
      return
    case 'todo/text': {
      const todo = findTodo(note, op.id)
      if (todo) todo.text = op.after
      return
    }
    case 'todo/toggle': {
      const todo = findTodo(note, op.id)
      if (todo) todo.done = op.after
      return
    }
  }
}

export const revertOp = (note: Note, op: HistoryOp): void => {
  switch (op.type) {
    case 'title/set':
      note.title = op.before
      return
    case 'todo/add':
      note.todos.splice(op.index, 1)
      return
    case 'todo/remove':
      note.todos.splice(op.index, 0, { ...op.item })
      return
    case 'todo/text': {
      const todo = findTodo(note, op.id)
      if (todo) todo.text = op.before
      return
    }
    case 'todo/toggle': {
      const todo = findTodo(note, op.id)
      if (todo) todo.done = op.before
      return
    }
  }
}

const sameTarget = (a: TextOp, b: TextOp) => {
  if (a.type === 'title/set' && b.type === 'title/set') return true
  return a.type === 'todo/text' && b.type === 'todo/text' && a.id === b.id
}

export const createHistory = (): HistoryManager => {
  const undoStack: HistoryOp[] = []
  const redoStack: HistoryOp[] = []
  let pending: TextOp | null = null

  const pushOp = (op: HistoryOp) => {
    undoStack.push(op)
    // в стеке лежат дельты, поэтому лимит 50 — это 50 операций, а не 50 копий заметки
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift()
    redoStack.length = 0
  }

  const flush = () => {
    if (!pending) return
    const op = pending
    pending = null
    if (op.before === op.after) return
    pushOp(op)
  }

  const push = (op: HistoryOp) => {
    flush()
    pushOp(op)
  }

  const pushText = (op: TextOp) => {
    if (pending && sameTarget(pending, op)) {
      pending.after = op.after
      return
    }
    flush()
    pending = { ...op }
    redoStack.length = 0
  }

  const undo = () => {
    flush()
    const op = undoStack.pop()
    if (!op) return null
    redoStack.push(op)
    return op
  }

  const redo = () => {
    flush()
    const op = redoStack.pop()
    if (!op) return null
    undoStack.push(op)
    return op
  }

  const reset = () => {
    undoStack.length = 0
    redoStack.length = 0
    pending = null
  }

  return {
    push,
    pushText,
    flush,
    undo,
    redo,
    reset,
    // pending попадает в canUndo: иначе кнопка мертва первые 500 мс набора, хотя Ctrl+Z в этот момент уже работает
    get canUndo() {
      return undoStack.length > 0 || pending !== null
    },
    get canRedo() {
      return redoStack.length > 0
    },
    get size() {
      return undoStack.length
    }
  }
}
