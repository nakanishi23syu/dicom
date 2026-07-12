// ======================================================
// stores/dicomStore.ts — DICOM グローバル状態管理（Pinia Store）
// ======================================================
// 【Pinia（ピニャ）とは？】
// Vue 3 公式の状態管理ライブラリ。Vuex の後継。
// 「Store（ストア）」はアプリ全体で共有される状態（データ）の置き場所。
//
// コンポーネントの ref は「そのコンポーネントが生きている間だけ」存在するが、
// Store のデータは「アプリが起動している間ずっと」保持される。
// ページ遷移しても studies データが消えない、のが Store の特徴。
//
// 【なぜ Store が必要か？】
// studies データは StudyListView だけでなく、将来的に検索画面や
// 統計画面でも参照したい。そういった「複数コンポーネントで共有するデータ」を
// Store に置くことで、Props/Emits のリレーを避けられる。

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchStudies as fetchStudiesFromBackend } from '@/services/backendApiService'
import { mapBackendStudy } from '@/services/dicomService'
import type { DicomStudy } from '@/types/dicom'

// ======================================================
// defineStore — Store の定義
// ======================================================
// defineStore('ストアID', セットアップ関数) の形式。
// ストアIDはDevToolsでの識別に使われるので意味のある名前をつける。
// セットアップ関数の中身は <script setup> と同じ感覚で書ける（Composition API スタイル）。
export const useDicomStore = defineStore('dicom', () => {
  // ── State（状態）────────────────────────────────────────
  // Store 内の ref / reactive がそのまま State になる。

  // 読み込み済みの検査一覧
  const studies = ref<DicomStudy[]>([])

  // 通信中フラグ（true の間はローディング表示）
  const loading = ref(false)

  // エラーメッセージ（エラーがなければ null）
  const error = ref<string | null>(null)

  // ── Actions（状態を変更する関数）────────────────────────
  // Store 内で定義した関数が Action になる。
  // 非同期処理も普通に async/await で書ける（Vuex と違ってシンプル）。

  // fetchStudies — backendのGraphQLから検査一覧を取得し、画面用の型に変換して格納する
  async function fetchStudies() {
    loading.value = true
    error.value = null
    try {
      const backendStudies = await fetchStudiesFromBackend()
      studies.value = backendStudies.map(mapBackendStudy)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '検査データの読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  // Store から外部に公開するものを return する
  // （コンポーネントは useDicomStore() の戻り値からこれらを使う）
  return { studies, loading, error, fetchStudies }
})
