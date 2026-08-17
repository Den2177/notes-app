<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { TodoItem } from '~/types/note'

defineProps<{ todos: TodoItem[] }>()
const emit = defineEmits<{
  add: []
  toggle: [id: string]
  text: [id: string, value: string]
  blur: []
  enter: []
  remove: [id: string]
}>()

const list = ref<HTMLElement | null>(null)

const onAdd = async () => {
  emit('add')
  await nextTick()
  const inputs = list.value?.querySelectorAll<HTMLInputElement>('input[type="text"]')
  inputs?.[inputs.length - 1]?.focus()
}
</script>

<template>
  <div class="todos">
    <ul ref="list" class="todos__list">
      <TodoItemRow
        v-for="todo in todos"
        :key="todo.id"
        :todo="todo"
        @toggle="emit('toggle', todo.id)"
        @text="emit('text', todo.id, $event)"
        @blur="emit('blur')"
        @enter="emit('enter')"
        @remove="emit('remove', todo.id)"
      />
    </ul>
    <BaseButton variant="secondary" @click="onAdd">
      <IconPlus />
      Добавить пункт
    </BaseButton>
  </div>
</template>

<style scoped lang="scss">
.todos {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: $space * 1.5;

  &__list {
    display: grid;
    gap: $space;
    width: 100%;
  }
}
</style>
