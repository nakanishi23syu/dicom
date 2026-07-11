// ======================================================
// main.ts — アプリのエントリーポイント（起動ファイル）
// ======================================================

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// createApp でアプリインスタンスを生成し、
// .use() でプラグインを登録してから .mount() でDOMに紐付ける。
// チェーン（メソッドの連続呼び出し）で書ける。
createApp(App)
  .use(createPinia()) // Pinia を有効化（Store が使えるようになる）
  .use(router) // Vue Router を有効化（<RouterView> / <RouterLink> が使えるようになる）
  .mount('#app')
