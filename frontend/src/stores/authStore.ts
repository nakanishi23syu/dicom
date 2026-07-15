// ======================================================
// stores/authStore.ts — ログイン状態のグローバル管理（Pinia Store）
// ======================================================
// dicomStore.ts と同じCompositoin APIスタイルのPiniaストア。
//
// 【セキュリティ対応】以前はJWT自体をlocalStorageに保存し、ページリロード後も
// そこから読み込んで復元していたが、localStorageはXSS（悪意あるスクリプトの混入）が
// 起きた場合に同一オリジンのどんなJavaScriptからも読めてしまうため、トークンを
// 盗まれるリスクがあった。
// 対応として、JWTはbackendがhttpOnly Cookieとして発行する方式に変更した
// （services/graphqlClient.ts が credentials: 'include' で自動送信する）。
// httpOnly CookieはJavaScriptから値を読めないため、フロントエンドはトークンの値を
// 一切保持しない。その代わり、ページリロード後のログイン状態復元は
// restoreSession() が backend の me クエリに問い合わせる方式にした
// （Cookieが有効ならdisplayName/isAdminを返してくれる）。
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { login as loginRequest, logout as logoutRequest, me as meRequest } from '@/services/authService'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────
  // トークンは保持しない（Cookieの中身はJSから見えないし、見る必要もない）。
  const displayName = ref<string>('')
  const isAdmin = ref<boolean>(false)
  const isLoggedIn = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Actions ────────────────────────────────────────────
  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const payload = await loginRequest(username, password)
      displayName.value = payload.displayName
      isAdmin.value = payload.isAdmin
      isLoggedIn.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'ログインに失敗しました'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await logoutRequest()
    } finally {
      displayName.value = ''
      isAdmin.value = false
      isLoggedIn.value = false
    }
  }

  // アプリ起動時（main.ts）に1回呼び出し、Cookieがまだ有効ならログイン状態を復元する。
  // 未ログイン（Cookieが無い/期限切れ）でもエラーにはせず、単に非ログイン状態のままにする。
  async function restoreSession() {
    const result = await meRequest()
    if (result) {
      displayName.value = result.displayName
      isAdmin.value = result.isAdmin
      isLoggedIn.value = true
    }
  }

  return { displayName, isAdmin, isLoggedIn, loading, error, login, logout, restoreSession }
})
