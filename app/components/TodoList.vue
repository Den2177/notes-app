<script setup lang="ts">
import { nextTick, ref } from 'vue'
import type { TodoItem } from '~/types/note'

const { todos } = defineProps<{ todos: TodoItem[] }>()
const emit = defineEmits<{
  add: []
  toggle: [id: string]
  text: [id: string, value: string]
  blur: [id: string]
  enter: []
  remove: [id: string]
}>()

const list = ref<HTMLElement | null>(null)

const focusLast = async () => {
  await nextTick()
  const inputs = list.value?.querySelectorAll<HTMLInputElement>('input[type="text"]')
  inputs?.[inputs.length - 1]?.focus()
}

const onAdd = () => {
  const last = todos[todos.length - 1]
  if (last && !last.text.trim()) {
    focusLast()
    return
  }
  emit('add')
  focusLast()
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
        @blur="emit('blur', todo.id)"
        @enter="emit('enter')"
        @remove="emit('remove', todo.id)"
      />
    </ul>
    <!-- mousedown.prevent: иначе blur пустого пункта успевает удалить его до click, и вместо перевода фокуса создаётся новый пункт -->
    <BaseButton variant="secondary" @mousedown.prevent @click="onAdd">
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
