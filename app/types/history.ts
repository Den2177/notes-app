import type { TodoItem } from '~/types/note'

export type HistoryOp =
  | { type: 'title/set'; before: string; after: string }
  | { type: 'todo/add'; index: number; item: TodoItem }
  | { type: 'todo/remove'; index: number; item: TodoItem }
  | { type: 'todo/text'; id: string; before: string; after: string }
  | { type: 'todo/toggle'; id: string; before: boolean; after: boolean }

export type TextOp = Extract<HistoryOp, { type: 'title/set' | 'todo/text' }>

export interface HistoryManager {
  push(op: HistoryOp): void
  // правки текста идут через pushText: подряд идущие правки одного поля сливаются в одну запись
  pushText(op: TextOp): void
  flush(): void
  undo(): HistoryOp | null
  redo(): HistoryOp | null
  reset(): void
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly size: number
}
