<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <input v-model="model" type="checkbox" class="checkbox">
</template>

<style scoped lang="scss">
.checkbox {
  @include focus-ring;
  flex: none;
  width: 18px;
  height: 18px;
  margin: 0;
  appearance: none;
  border: 1.5px solid $color-border;
  border-radius: 4px;
  background: $color-surface;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;

  &:hover:not(:disabled) {
    border-color: $color-muted;
  }

  &:checked {
    border-color: $color-accent;
    background-color: $color-accent;
    // галочка фоном, а не ::after: псевдоэлементы на input в firefox не рисуются
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' d='M3 8.5 6.5 12 13 4'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 13px;
  }

  &:disabled {
    cursor: default;
    opacity: 0.65;
  }
}
</style>
