<script setup lang="ts">
import { computed } from 'vue'
import type { Note } from '~/types/note'

const { note } = defineProps<{ note: Note }>()
const emit = defineEmits<{ remove: [] }>()

const PREVIEW_LIMIT = 3
const preview = computed(() => note.todos.slice(0, PREVIEW_LIMIT))
const hidden = computed(() => note.todos.length - preview.value.length)
</script>

<template>
  <li class="card">
    <NuxtLink :to="`/notes/${note.id}`" class="card__link">
      <h2 class="card__title">{{ note.title || 'Без названия' }}</h2>
      <ul v-if="note.todos.length" class="card__todos">
        <li v-for="todo in preview" :key="todo.id" class="card__todo">
          <BaseCheckbox :model-value="todo.done" disabled />
          <span class="card__text" :class="{ 'card__text--done': todo.done }">{{ todo.text }}</span>
        </li>
      </ul>
      <p v-else class="card__empty">Без пунктов</p>
      <p v-if="hidden > 0" class="card__more">и ещё {{ hidden }}</p>
    </NuxtLink>
    <IconButton label="Удалить заметку" variant="danger" class="card__remove" @click="emit('remove')">
      <IconTrash />
    </IconButton>
  </li>
</template>

<style scoped lang="scss">
.card {
  @include card;
  position: relative;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: $color-accent;
  }

  &__link {
    display: block;
    padding: $space * 2;
    padding-right: $space * 6;
    color: inherit;

    &:hover {
      text-decoration: none;
    }
  }

  &__title {
    font-size: $font-lg;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  &__todos {
    margin-top: $space * 1.5;
    display: grid;
    gap: $space;
  }

  &__todo {
    display: flex;
    align-items: center;
    gap: $space;
  }

  &__text {
    overflow-wrap: anywhere;

    &--done {
      color: $color-muted;
      text-decoration: line-through;
    }
  }

  &__empty,
  &__more {
    margin-top: $space;
    color: $color-muted;
    font-size: $font-sm;
  }

  &__remove {
    position: absolute;
    top: $space * 1.5;
    right: $space * 1.5;
  }
}
</style>
