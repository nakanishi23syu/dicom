// ======================================================
// tutorialCounterStore.ts — Pinia Store の最小サンプル
// ======================================================
// 実アプリの状態管理は src/stores/dicomStore.ts を参照。
// こちらは「Storeとは何か」を学ぶための、DICOMと無関係な最小サンプル。

import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// defineStore('一意なID', セットアップ関数)
// このIDはPinia DevToolsでの表示名になる。アプリ内で重複してはいけない。
export const useTutorialCounterStore = defineStore('tutorial-counter', () => {
  // ── State ──────────────────────────────────────────
  const count = ref(0)

  // ── Getters（Vuexでいう getters。ここでは computed で代用する）──
  const isEven = computed(() => count.value % 2 === 0)

  // ── Actions（状態を変更する関数）──────────────────────
  function increment() {
    count.value++
  }

  function reset() {
    count.value = 0
  }

  return { count, isEven, increment, reset }
})
