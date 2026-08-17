import { describe, expect, it } from 'vitest'
import type { HistoryManager, HistoryOp } from '~/types/history'
import type { Note } from '~/types/note'
import { applyOp, createHistory, revertOp } from '~/utils/history'

const makeNote = (): Note => ({
  id: 'n1',
  title: 'Дела',
  todos: [
    { id: 't1', text: 'Молоко', done: false },
    { id: 't2', text: 'Хлеб', done: true }
  ],
  createdAt: 1000,
  updatedAt: 1000
})

const allOps: HistoryOp[] = [
  { type: 'title/set', before: 'Дела', after: 'Покупки' },
  { type: 'todo/add', index: 2, item: { id: 't3', text: 'Сыр', done: false } },
  { type: 'todo/remove', index: 0, item: { id: 't1', text: 'Молоко', done: false } },
  { type: 'todo/text', id: 't2', before: 'Хлеб', after: 'Батон' },
  { type: 'todo/toggle', id: 't1', before: false, after: true }
]

const undoInto = (note: Note, h: HistoryManager) => {
  const op = h.undo()
  if (op) revertOp(note, op)
}

const redoInto = (note: Note, h: HistoryManager) => {
  const op = h.redo()
  if (op) applyOp(note, op)
}

describe('операции как дельты', () => {
  it.each(allOps)('revertOp после applyOp возвращает заметку к исходному состоянию: $type', (op) => {
    const note = makeNote()
    applyOp(note, op)
    expect(note).not.toEqual(makeNote())
    revertOp(note, op)
    expect(note).toEqual(makeNote())
  })

  it('добавление и удаление работают по индексу, а не по концу списка', () => {
    const note = makeNote()
    applyOp(note, { type: 'todo/add', index: 1, item: { id: 't9', text: 'Сыр', done: false } })
    expect(note.todos.map(t => t.id)).toEqual(['t1', 't9', 't2'])
    applyOp(note, { type: 'todo/remove', index: 0, item: { id: 't1', text: 'Молоко', done: false } })
    expect(note.todos.map(t => t.id)).toEqual(['t9', 't2'])
  })

  it('запись в истории не начинает меняться вместе с заметкой', () => {
    const note = makeNote()
    const removeOp: HistoryOp = { type: 'todo/remove', index: 0, item: { id: 't1', text: 'Молоко', done: false } }
    const addOp: HistoryOp = { type: 'todo/add', index: 0, item: { id: 't9', text: '', done: false } }

    applyOp(note, removeOp)
    revertOp(note, removeOp)
    applyOp(note, { type: 'todo/text', id: 't1', before: 'Молоко', after: 'Кефир' })
    expect(removeOp).toEqual({ type: 'todo/remove', index: 0, item: { id: 't1', text: 'Молоко', done: false } })

    applyOp(note, addOp)
    applyOp(note, { type: 'todo/toggle', id: 't9', before: false, after: true })
    applyOp(note, { type: 'todo/text', id: 't9', before: '', after: 'Сыр' })
    expect(addOp).toEqual({ type: 'todo/add', index: 0, item: { id: 't9', text: '', done: false } })
  })
})

describe('undo и redo', () => {
  it('пустая история ничего не отдаёт', () => {
    const h = createHistory()
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)
    expect(h.size).toBe(0)
    expect(h.undo()).toBeNull()
    expect(h.redo()).toBeNull()
  })

  it('после push можно отменять, но нечего повторять', () => {
    const h = createHistory()
    h.push({ type: 'todo/toggle', id: 't1', before: false, after: true })
    expect(h.canUndo).toBe(true)
    expect(h.canRedo).toBe(false)
    expect(h.size).toBe(1)
  })

  it('undo откатывает состояние заметки, redo возвращает', () => {
    const note = makeNote()
    const h = createHistory()
    const op: HistoryOp = { type: 'title/set', before: 'Дела', after: 'Покупки' }
    applyOp(note, op)
    h.push(op)

    undoInto(note, h)
    expect(note.title).toBe('Дела')
    expect(h.canRedo).toBe(true)

    redoInto(note, h)
    expect(note.title).toBe('Покупки')
    expect(h.canRedo).toBe(false)
    expect(h.canUndo).toBe(true)
  })

  it('несколько шагов отменяются в обратном порядке', () => {
    const note = makeNote()
    const h = createHistory()
    for (const op of allOps) {
      applyOp(note, op)
      h.push(op)
    }
    expect(h.size).toBe(allOps.length)
    for (let i = 0; i < allOps.length; i++) undoInto(note, h)
    expect(note).toEqual(makeNote())
    expect(h.canUndo).toBe(false)
  })

  it('новая операция после undo обрубает ветку redo', () => {
    const h = createHistory()
    h.push({ type: 'todo/toggle', id: 't1', before: false, after: true })
    h.push({ type: 'todo/toggle', id: 't2', before: true, after: false })
    h.undo()
    expect(h.canRedo).toBe(true)
    h.push({ type: 'title/set', before: 'Дела', after: 'Покупки' })
    expect(h.canRedo).toBe(false)
    expect(h.redo()).toBeNull()
  })

  it('начатый ввод текста тоже обрубает ветку redo, не дожидаясь коммита', () => {
    const h = createHistory()
    h.push({ type: 'todo/toggle', id: 't1', before: false, after: true })
    h.undo()
    h.pushText({ type: 'title/set', before: 'Дела', after: 'Д' })
    expect(h.canRedo).toBe(false)
  })
})

describe('коалесинг ввода текста', () => {
  it('серия правок одного поля превращается в одну запись от первого before до последнего after', () => {
    const h = createHistory()
    h.pushText({ type: 'title/set', before: '', after: 'П' })
    h.pushText({ type: 'title/set', before: 'П', after: 'Пок' })
    h.pushText({ type: 'title/set', before: 'Пок', after: 'Покупки' })
    h.flush()
    expect(h.size).toBe(1)
    expect(h.undo()).toEqual({ type: 'title/set', before: '', after: 'Покупки' })
  })

  it('пауза или blur приходят как flush и разрывают серию', () => {
    const h = createHistory()
    h.pushText({ type: 'title/set', before: '', after: 'Пок' })
    h.flush()
    h.pushText({ type: 'title/set', before: 'Пок', after: 'Покупки' })
    h.flush()
    expect(h.size).toBe(2)
  })

  it('переход на другое поле немедленно закрывает предыдущую запись', () => {
    const h = createHistory()
    h.pushText({ type: 'title/set', before: '', after: 'Покупки' })
    h.pushText({ type: 'todo/text', id: 't1', before: 'Молоко', after: 'Кефир' })
    expect(h.size).toBe(1)
    h.flush()
    expect(h.size).toBe(2)
  })

  it('правки разных пунктов todo не сливаются', () => {
    const h = createHistory()
    h.pushText({ type: 'todo/text', id: 't1', before: 'Молоко', after: 'Кефир' })
    h.pushText({ type: 'todo/text', id: 't2', before: 'Хлеб', after: 'Батон' })
    h.flush()
    expect(h.size).toBe(2)
  })

  it('undo без явного flush сначала коммитит набранное', () => {
    const note = makeNote()
    const h = createHistory()
    note.title = 'Покупки'
    h.pushText({ type: 'title/set', before: 'Дела', after: 'Покупки' })
    undoInto(note, h)
    expect(note.title).toBe('Дела')
    expect(h.canUndo).toBe(false)
  })

  it('незакрытый ввод уже считается отменяемым', () => {
    const h = createHistory()
    h.pushText({ type: 'title/set', before: 'Дела', after: 'Д' })
    expect(h.canUndo).toBe(true)
    expect(h.size).toBe(0)
  })

  it('правка, вернувшая текст к исходному, в историю не попадает', () => {
    const h = createHistory()
    h.pushText({ type: 'title/set', before: 'Дела', after: 'Делаа' })
    h.pushText({ type: 'title/set', before: 'Делаа', after: 'Дела' })
    h.flush()
    expect(h.size).toBe(0)
    expect(h.canUndo).toBe(false)
  })
})

describe('атомарные операции', () => {
  it('чекбокс не сливается с предыдущим вводом текста и встаёт после него', () => {
    const h = createHistory()
    h.pushText({ type: 'todo/text', id: 't1', before: 'Молоко', after: 'Кефир' })
    h.push({ type: 'todo/toggle', id: 't1', before: false, after: true })
    expect(h.size).toBe(2)
    expect(h.undo()).toMatchObject({ type: 'todo/toggle' })
    expect(h.undo()).toMatchObject({ type: 'todo/text' })
  })

  it('два подряд toggle одного пункта остаются двумя записями', () => {
    const h = createHistory()
    h.push({ type: 'todo/toggle', id: 't1', before: false, after: true })
    h.push({ type: 'todo/toggle', id: 't1', before: true, after: false })
    expect(h.size).toBe(2)
  })

  it('добавление и удаление пунктов не коалесятся', () => {
    const h = createHistory()
    h.push({ type: 'todo/add', index: 0, item: { id: 't9', text: '', done: false } })
    h.push({ type: 'todo/add', index: 1, item: { id: 't10', text: '', done: false } })
    h.push({ type: 'todo/remove', index: 1, item: { id: 't10', text: '', done: false } })
    expect(h.size).toBe(3)
  })
})

describe('лимит истории', () => {
  it('на 51-й записи выбрасывается самая старая', () => {
    const h = createHistory()
    for (let i = 0; i <= 50; i++) {
      h.push({ type: 'todo/toggle', id: `t${i}`, before: false, after: true })
    }
    expect(h.size).toBe(50)

    const drained: HistoryOp[] = []
    for (let i = 0; i < 50; i++) {
      const op = h.undo()
      if (op) drained.push(op)
    }
    expect(drained).toHaveLength(50)
    expect(drained[0]).toMatchObject({ id: 't50' })
    expect(drained[49]).toMatchObject({ id: 't1' })
    expect(drained.some(op => 'id' in op && op.id === 't0')).toBe(false)
    expect(h.undo()).toBeNull()
  })
})

describe('сброс сессии редактирования', () => {
  it('reset чистит оба стека и незакрытый ввод', () => {
    const h = createHistory()
    h.push({ type: 'todo/toggle', id: 't1', before: false, after: true })
    h.push({ type: 'todo/toggle', id: 't2', before: true, after: false })
    h.undo()
    h.pushText({ type: 'title/set', before: 'Дела', after: 'Покупки' })

    h.reset()
    expect(h.size).toBe(0)
    expect(h.canUndo).toBe(false)
    expect(h.canRedo).toBe(false)

    h.flush()
    expect(h.size).toBe(0)
  })
})
