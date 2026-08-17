export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  components: [{ path: '~/components', pathPrefix: false }],
  // при ssr: false все страницы — одна и та же оболочка; без этого generate раскладывает /notes/new каталогом,
  // и nginx редиректит на слеш, теряя порт при проброшенном 3000:80
  nitro: { prerender: { crawlLinks: false } },
  css: ['~/assets/scss/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/variables" as *;\n@use "~/assets/scss/mixins" as *;\n'
        }
      }
    }
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
      title: 'Заметки'
    }
  },
  typescript: {
    strict: true,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true
      }
    }
  }
})
