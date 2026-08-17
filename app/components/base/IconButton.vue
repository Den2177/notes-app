<script setup lang="ts">
const { label, variant = 'default' } = defineProps<{
  label: string
  variant?: 'default' | 'danger'
}>()
</script>

<template>
  <button type="button" class="icon-btn" :class="{ 'icon-btn--danger': variant === 'danger' }" :aria-label="label" :title="label">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.icon-btn {
  @include button-reset;
  @include focus-ring;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: $radius;
  color: $color-muted;
  transition: background-color 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: rgba(16, 24, 40, 0.06);
    color: $color-text;
  }

  &:active:not(:disabled) {
    background: rgba(16, 24, 40, 0.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &--danger:hover:not(:disabled) {
    background: rgba($color-danger, 0.1);
    color: $color-danger;
  }
}
</style>
