import { computed, ref } from 'vue'

export interface ConfirmRequest {
  title: string
  text?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
}

const request = ref<ConfirmRequest | null>(null)
let resolveCurrent: ((ok: boolean) => void) | null = null

export const useConfirm = () => {
  const confirm = (req: ConfirmRequest) => new Promise<boolean>((resolve) => {
    request.value = req
    resolveCurrent = resolve
  })

  const settle = (ok: boolean) => {
    request.value = null
    resolveCurrent?.(ok)
    resolveCurrent = null
  }

  return { request, isOpen: computed(() => request.value !== null), confirm, settle }
}
