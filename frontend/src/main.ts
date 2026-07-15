// ======================================================
// main.ts — アプリのエントリーポイント（起動ファイル）
// ======================================================

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'

// カラーテーマ用のCSS変数定義。ここで読み込むと :root の変数がアプリ全体で使えるようになる。
// 詳しい説明は styles/theme.css のコメントを参照。
import './styles/theme.css'

// createApp でアプリインスタンスを生成し、
// .use() でプラグインを登録してから .mount() でDOMに紐付ける。
// チェーン（メソッドの連続呼び出し）で書ける。
const app = createApp(App)
app.use(createPinia()) // Pinia を有効化（Store が使えるようになる）
app.use(router) // Vue Router を有効化（<RouterView> / <RouterLink> が使えるようになる）

// ログイン状態はもうlocalStorageに保存していない（stores/authStore.ts参照）ため、
// 起動時にbackendのmeクエリへ問い合わせてCookieがまだ有効か確認し、状態を復元してからマウントする。
// こうすることで「一瞬ログアウト状態のヘッダーが見えてからログイン状態に切り替わる」チラつきを防ぐ。
useAuthStore()
  .restoreSession()
  .catch(() => {
    // 未ログイン・通信エラーのいずれでも、単に非ログイン状態のまま表示を続ければよい。
  })
  .finally(() => {
    app.mount('#app')
  })
