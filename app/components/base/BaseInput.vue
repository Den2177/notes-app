<script setup lang="ts">
const model = defineModel<string>({ required: true })
</script>

<template>
  <input v-model="model" type="text" class="input">
</template>

<style scoped lang="scss">
.input {
  @include focus-ring;
  width: 100%;
  min-height: 40px;
  padding: 0 $space * 1.5;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-surface;
  transition: border-color 0.15s;

  &::placeholder {
    color: $color-muted;
  }

  &:hover {
    border-color: $color-muted;
  }

  &:focus {
    border-color: $color-accent;
  }
}
</style>
