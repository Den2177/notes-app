<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useConfirm } from '~/composables/useConfirm'
import { useUndoRedoHotkeys } from '~/composables/useHotkeys'
import { useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

const editor = useEditorStore()
const notes = useNotesStore()
const { confirm } = useConfirm()

useUndoRedoHotkeys()

onMounted(async () => {
  const draft = editor.pendingDraft()
  if (!draft) return
  const ok = await confirm({
    title: 'Найден несохранённый черновик',
    text: 'Восстановить изменения, сделанные в прошлый раз?',
    confirmLabel: 'Восстановить',
    cancelLabel: 'Отклонить'
  })
  if (ok) {
    editor.restoreDraft(draft)
    return
  }
  editor.dismissDraft()
})

watch(() => editor.isActive && !editor.isNew && !notes.getById(editor.note.id), async (gone) => {
  if (!gone) return
  const ok = await confirm({
    title: 'Заметка была удалена в другой вкладке',
    text: 'В списке её больше нет. Текущие изменения можно сохранить как новую заметку.',
    confirmLabel: 'Сохранить как новую',
    cancelLabel: 'Вернуться к списку'
  })
  if (ok) editor.saveAsNew()
  else editor.discard()
  navigateTo('/')
})

const onSave = () => {
  editor.save()
  navigateTo('/')
}

const onCancel = async () => {
  editor.flushText()
  const ok = await confirm({
    title: 'Отменить редактирование?',
    text: 'Несохранённые изменения будут потеряны.',
    confirmLabel: 'Отменить изменения',
    cancelLabel: 'Продолжить'
  })
  if (!ok) return
  editor.discard()
  navigateTo('/')
}

const onRemove = async () => {
  editor.flushText()
  const ok = await confirm({
    title: 'Удалить заметку?',
    text: 'Заметка и все её пункты будут удалены безвозвратно.',
    confirmLabel: 'Удалить',
    cancelLabel: 'Отмена',
    danger: true
  })
  if (!ok) return
  editor.removeNote()
  navigateTo('/')
}
</script>

<template>
  <main class="editor">
    <header class="editor__head">
      <NuxtLink to="/" class="editor__back">К списку заметок</NuxtLink>
      <div class="editor__history">
        <IconButton label="Отменить (Ctrl+Z)" :disabled="!editor.canUndo" @click="editor.undo()">
          <IconUndo />
        </IconButton>
        <IconButton label="Повторить (Shift+Ctrl+Z)" :disabled="!editor.canRedo" @click="editor.redo()">
          <IconRedo />
        </IconButton>
      </div>
    </header>

    <BaseInput
      :model-value="editor.note.title"
      class="editor__title"
      placeholder="Без названия"
      aria-label="Название заметки"
      @update:model-value="editor.setTitle"
      @blur="editor.flushText()"
      @keydown.enter="editor.flushText()"
    />

    <TodoList
      :todos="editor.note.todos"
      @add="editor.addTodo()"
      @toggle="editor.toggleTodo"
      @text="editor.setTodoText"
      @blur="editor.flushText()"
      @enter="editor.flushText()"
      @remove="editor.removeTodo"
    />

    <footer class="editor__actions">
      <BaseButton @click="onSave">Сохранить</BaseButton>
      <BaseButton variant="secondary" @click="onCancel">Отменить редактирование</BaseButton>
      <BaseButton variant="danger" @click="onRemove">Удалить заметку</BaseButton>
    </footer>
  </main>
</template>

<style scoped lang="scss">
.editor {
  display: flex;
  flex-direction: column;
  gap: $space * 2;
  max-width: 720px;
  margin: 0 auto;
  padding: $space * 2;

  @include respond-to($bp-md) {
    padding: $space * 4 $space * 2;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space;
  }

  &__back {
    font-size: $font-sm;
  }

  &__history {
    display: flex;
    gap: $space * 0.5;
  }

  &__title {
    font-size: $font-lg;
    font-weight: 600;
    min-height: 48px;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: $space;
    margin-top: $space * 2;

    @include respond-to($bp-sm) {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }
}
</style>
