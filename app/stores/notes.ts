import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Note } from '~/types/note'
import { installFlushOnHide, readNotes, saveNotes, watchNotes } from '~/utils/storage'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>(readNotes().notes)

  installFlushOnHide()
  // список из другой вкладки принимаем как есть и обратно не пишем, иначе две вкладки затопчут друг друга
  watchNotes((external) => {
    notes.value = external
  })

  const getById = (id: string) => notes.value.find(n => n.id === id)

  const save = (note: Note) => {
    // в список кладём копию: редактор продолжает работать со своим объектом и не должен незаметно менять сохранённое
    const stored: Note = {
      ...note,
      title: note.title.trim(),
      todos: note.todos.map(t => ({ ...t })),
      updatedAt: Date.now()
    }
    const idx = notes.value.findIndex(n => n.id === stored.id)
    if (idx === -1) notes.value.unshift(stored)
    else notes.value[idx] = stored
    saveNotes(notes.value)
    return stored
  }

  const remove = (id: string) => {
    notes.value = notes.value.filter(n => n.id !== id)
    saveNotes(notes.value)
  }

  return { notes, getById, save, remove }
})
