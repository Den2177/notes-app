<script setup lang="ts">
defineProps<{
  title: string
  text?: string
}>()
</script>

<template>
  <div class="empty">
    <p class="empty__title">{{ title }}</p>
    <p v-if="text" class="empty__text">{{ text }}</p>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.empty {
  @include card;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space * 1.5;
  padding: $space * 5 $space * 2;
  text-align: center;

  &__title {
    font-size: $font-lg;
    font-weight: 600;
  }

  &__text {
    max-width: 40ch;
    color: $color-muted;
  }
}
</style>
