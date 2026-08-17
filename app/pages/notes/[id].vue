<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'
import { useNotesStore } from '~/stores/notes'

const editor = useEditorStore()
const source = useNotesStore().getById(String(useRoute().params.id))

if (source) editor.openExisting(source)

const goList = () => navigateTo('/')
</script>

<template>
  <NoteEditor v-if="source" />
  <main v-else class="missing">
    <EmptyState title="Заметка не найдена" text="Возможно, её удалили или ссылка устарела.">
      <BaseButton @click="goList">К списку заметок</BaseButton>
    </EmptyState>
  </main>
</template>

<style scoped lang="scss">
.missing {
  max-width: 720px;
  margin: 0 auto;
  padding: $space * 4 $space * 2;
}
</style>
