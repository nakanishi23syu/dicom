import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // '@/components/Foo.vue' → 'src/components/Foo.vue' に解決される
      // import 文を相対パス（../../）ではなく絶対パス風に書けるようになる
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
