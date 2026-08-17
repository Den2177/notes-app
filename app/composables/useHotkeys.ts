import { onBeforeUnmount, onMounted } from 'vue'
import { useConfirm } from '~/composables/useConfirm'
import { useEditorStore } from '~/stores/editor'

export const useUndoRedoHotkeys = () => {
  const editor = useEditorStore()
  const { isOpen } = useConfirm()

  const onKeydown = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    const isUndoKey = e.code === 'KeyZ'
    const isRedoKey = e.code === 'KeyY'
    if (!isUndoKey && !isRedoKey) return

    // перехватываем всегда, включая фокус в input: нативный undo браузера откатывает значение поля мимо стора
    // и рассинхронизирует DOM с историей, единственный источник правды — наш стек. code, а не key: на кириллической
    // раскладке key приходит как 'я'
    e.preventDefault()
    if (isOpen.value) return

    if (isRedoKey || e.shiftKey) {
      editor.redo()
      return
    }
    editor.undo()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
