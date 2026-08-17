import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type App } from 'vue'
import { useConfirm } from '~/composables/useConfirm'
import { useUndoRedoHotkeys } from '~/composables/useHotkeys'
import { useEditorStore } from '~/stores/editor'
import { saveDraft } from '~/utils/storage'

// хоткеи живут в onMounted, поэтому композабл поднимается в минимальном компоненте, а не через test-utils
const Harness = defineComponent({
  setup() {
    useUndoRedoHotkeys()
    return () => h('div')
  }
})

let app: App | null = null

const press = (code: string, mods: Partial<KeyboardEventInit> = {}) => {
  const e = new KeyboardEvent('keydown', { code, ctrlKey: true, cancelable: true, ...mods })
  window.dispatchEvent(e)
  return e
}

const openEditorWithTitle = (title: string) => {
  const editor = useEditorStore()
  editor.openNew()
  editor.setTitle(title)
  return editor
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  app = createApp(Harness)
  app.use(pinia)
  app.mount(document.createElement('div'))
})

afterEach(() => {
  app?.unmount()
  app = null
  saveDraft.cancel()
  vi.useRealTimers()
})

describe('хоткеи undo и redo', () => {
  it('ctrl+z откатывает набранный текст и глушит нативный undo браузера', () => {
    const editor = openEditorWithTitle('Дела')
    const e = press('KeyZ')
    expect(e.defaultPrevented).toBe(true)
    expect(editor.note.title).toBe('')
    expect(editor.canRedo).toBe(true)
  })

  it('shift+ctrl+z и ctrl+y повторяют отменённое', () => {
    const editor = openEditorWithTitle('Дела')
    press('KeyZ')
    press('KeyZ', { shiftKey: true })
    expect(editor.note.title).toBe('Дела')

    press('KeyZ')
    press('KeyY')
    expect(editor.note.title).toBe('Дела')
  })

  it('cmd+z работает так же, как ctrl+z', () => {
    const editor = openEditorWithTitle('Дела')
    press('KeyZ', { ctrlKey: false, metaKey: true })
    expect(editor.note.title).toBe('')
  })

  it('без модификатора и на посторонних клавишах ничего не происходит', () => {
    const editor = openEditorWithTitle('Дела')
    press('KeyZ', { ctrlKey: false })
    press('KeyA')
    expect(editor.note.title).toBe('Дела')
  })

  it('при открытой модалке undo не срабатывает, но нативный undo всё равно заглушен', () => {
    const editor = openEditorWithTitle('Дела')
    const { confirm, settle } = useConfirm()
    void confirm({ title: 'Удалить заметку?', confirmLabel: 'Удалить', cancelLabel: 'Отмена' })

    const e = press('KeyZ')
    expect(e.defaultPrevented).toBe(true)
    expect(editor.note.title).toBe('Дела')

    settle(false)
    press('KeyZ')
    expect(editor.note.title).toBe('')
  })

  it('слушатель снимается вместе со страницей редактора', () => {
    const editor = openEditorWithTitle('Дела')
    app?.unmount()
    app = null
    press('KeyZ')
    expect(editor.note.title).toBe('Дела')
  })
})
