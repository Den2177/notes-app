<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useFocusTrap } from '~/composables/useFocusTrap'

defineProps<{
  title: string
  text?: string
}>()

const emit = defineEmits<{ close: [] }>()

const box = ref<HTMLElement | null>(null)
const { onTab } = useFocusTrap(box)
const titleId = useId()
const textId = useId()

onMounted(() => {
  document.body.style.overflow = 'hidden'
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'Tab') onTab(e)
}
</script>

<template>
  <Teleport to="body">
    <Transition appear name="modal">
      <!-- mousedown, а не click: иначе выделение текста, начатое внутри окна и отпущенное на фоне, закрывает окно -->
      <div class="backdrop" @mousedown.self="emit('close')">
        <div
          ref="box"
          class="dialog"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="text ? textId : undefined"
          @keydown="onKeydown"
        >
          <h2 :id="titleId" class="dialog__title">{{ title }}</h2>
          <p v-if="text" :id="textId" class="dialog__text">{{ text }}</p>
          <div class="dialog__actions">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $space * 2;
  background: rgba(16, 24, 40, 0.45);
}

.dialog {
  width: 100%;
  max-width: 420px;
  padding: $space * 3;
  border-radius: $radius;
  background: $color-surface;
  box-shadow: 0 12px 32px rgba(16, 24, 40, 0.24);

  &__title {
    font-size: $font-lg;
    font-weight: 600;
  }

  &__text {
    margin-top: $space;
    color: $color-muted;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: $space;
    margin-top: $space * 3;

    @include respond-to($bp-sm) {
      flex-direction: row;
    }
  }
}

.modal-enter-active {
  transition: opacity 0.15s ease;

  .dialog {
    transition: transform 0.15s ease;
  }
}

.modal-enter-from {
  opacity: 0;

  .dialog {
    transform: translateY(8px);
  }
}
</style>
