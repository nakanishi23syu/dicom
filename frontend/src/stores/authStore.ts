// ======================================================
// stores/authStore.ts — ログイン状態のグローバル管理（Pinia Store）
// ======================================================
// dicomStore.ts と同じCompositoin APIスタイルのPiniaストア。
// トークンはページをリロードしても消えてほしいので、初期値をlocalStorageから読み込み、
// login/logout のたびにlocalStorageへも書き戻す（＝PiniaのstateとlocalStorageを常に同期させる）。

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login as loginRequest } from '@/services/authService'
import {
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_DISPLAY_NAME_STORAGE_KEY,
  AUTH_IS_ADMIN_STORAGE_KEY,
} from '@/constants/auth'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──────────────────────────────────────────────
  // 初期値をlocalStorageから復元する（ページリロード後もログイン状態を保つため）。
  const token = ref<string | null>(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY))
  const displayName = ref<string>(localStorage.getItem(AUTH_DISPLAY_NAME_STORAGE_KEY) ?? '')
  const isAdmin = ref<boolean>(localStorage.getItem(AUTH_IS_ADMIN_STORAGE_KEY) === 'true')
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────
  const isLoggedIn = computed(() => token.value !== null)

  // ── Actions ────────────────────────────────────────────
  async function login(username: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const payload = await loginRequest(username, password)
      token.value = payload.token
      displayName.value = payload.displayName
      isAdmin.value = payload.isAdmin

      // graphqlClient.ts はこのキーを直接読むので、Piniaのstateと合わせてlocalStorageも更新する。
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token)
      localStorage.setItem(AUTH_DISPLAY_NAME_STORAGE_KEY, payload.displayName)
      localStorage.setItem(AUTH_IS_ADMIN_STORAGE_KEY, String(payload.isAdmin))
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'ログインに失敗しました'
      throw e
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    displayName.value = ''
    isAdmin.value = false
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_DISPLAY_NAME_STORAGE_KEY)
    localStorage.removeItem(AUTH_IS_ADMIN_STORAGE_KEY)
  }

  return { token, displayName, isAdmin, loading, error, isLoggedIn, login, logout }
})
