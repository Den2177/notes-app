<script setup lang="ts">
import { useEditorStore } from '~/stores/editor'

useEditorStore().openNew()
</script>

<template>
  <NoteEditor />
</template>
