import { onBeforeUnmount, onMounted, type Ref } from 'vue'

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const useFocusTrap = (container: Ref<HTMLElement | null>) => {
  let trigger: HTMLElement | null = null

  const items = () => {
    if (!container.value) return []
    return Array.from(container.value.querySelectorAll<HTMLElement>(FOCUSABLE))
  }

  const onTab = (e: KeyboardEvent) => {
    const list = items()
    const first = list[0]
    const last = list[list.length - 1]
    if (!first || !last) return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
      return
    }
    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  onMounted(() => {
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    items()[0]?.focus()
  })

  onBeforeUnmount(() => {
    trigger?.focus()
  })

  return { onTab }
}
