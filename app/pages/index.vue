<script setup lang="ts">
import type { Note } from '~/types/note'
import { useConfirm } from '~/composables/useConfirm'
import { useNotesStore } from '~/stores/notes'

const store = useNotesStore()
const { confirm } = useConfirm()

const openNew = () => navigateTo('/notes/new')

const onRemove = async (note: Note) => {
  const ok = await confirm({
    title: 'Удалить заметку?',
    text: `«${note.title || 'Без названия'}» и все её пункты будут удалены безвозвратно.`,
    confirmLabel: 'Удалить',
    cancelLabel: 'Отмена',
    danger: true
  })
  if (ok) store.remove(note.id)
}
</script>

<template>
  <main class="page">
    <header class="page__head">
      <h1 class="page__title">Заметки</h1>
      <BaseButton @click="openNew">
        <IconPlus />
        Создать заметку
      </BaseButton>
    </header>

    <EmptyState
      v-if="!store.notes.length"
      title="Пока нет заметок"
      text="Заметка — это название и список задач. Создайте первую, чтобы начать."
    >
      <BaseButton @click="openNew">Создать заметку</BaseButton>
    </EmptyState>

    <ul v-else class="page__list">
      <NoteCard v-for="note in store.notes" :key="note.id" :note="note" @remove="onRemove(note)" />
    </ul>
  </main>
</template>

<style scoped lang="scss">
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: $space * 2;

  @include respond-to($bp-md) {
    padding: $space * 4 $space * 2;
  }

  &__head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: $space * 1.5;
    margin-bottom: $space * 3;

    @include respond-to($bp-sm) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  &__title {
    font-size: $font-lg * 1.3;
    font-weight: 700;
  }

  &__list {
    display: grid;
    gap: $space * 1.5;
  }
}
</style>
