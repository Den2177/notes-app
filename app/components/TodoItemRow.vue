<script setup lang="ts">
import type { TodoItem } from '~/types/note'

const { todo } = defineProps<{ todo: TodoItem }>()
const emit = defineEmits<{
  toggle: []
  text: [value: string]
  blur: []
  enter: []
  remove: []
}>()
</script>

<template>
  <li class="todo">
    <BaseCheckbox :model-value="todo.done" @update:model-value="emit('toggle')" />
    <BaseInput
      :model-value="todo.text"
      class="todo__input"
      placeholder="Что нужно сделать"
      aria-label="Текст пункта"
      @update:model-value="emit('text', $event)"
      @blur="emit('blur')"
      @keydown.enter="emit('enter')"
    />
    <IconButton label="Удалить пункт" variant="danger" @click="emit('remove')">
      <IconTrash />
    </IconButton>
  </li>
</template>

<style scoped lang="scss">
.todo {
  display: flex;
  align-items: center;
  gap: $space;

  &__input {
    flex: 1;
    min-width: 0;
  }
}
</style>
