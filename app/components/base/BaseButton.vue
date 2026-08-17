<script setup lang="ts">
const { variant = 'primary' } = defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
}>()
</script>

<template>
  <button type="button" class="btn" :class="`btn--${variant}`">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.btn {
  @include button-reset;
  @include focus-ring;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $space;
  min-height: 40px;
  padding: 0 $space * 2;
  border: 1px solid transparent;
  border-radius: $radius;
  font-size: $font-base;
  font-weight: 500;
  transition: background-color 0.15s, border-color 0.15s;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &--primary {
    background: $color-accent;
    color: #fff;

    &:hover:not(:disabled) {
      background: $color-accent-hover;
    }
  }

  &--secondary {
    background: $color-surface;
    border-color: $color-border;

    &:hover:not(:disabled) {
      border-color: $color-muted;
    }
  }

  &--danger {
    background: $color-danger;
    color: #fff;

    &:hover:not(:disabled) {
      background: $color-danger-hover;
    }
  }
}
</style>
