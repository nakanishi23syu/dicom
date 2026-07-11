<!--
  ======================================================
  views/StudyListView.vue — 検査一覧ページ（ワークリスト）
  ======================================================
  実際のPACS製品「SYNAPSE LEAD」のワークリスト画面の構成に近づけている:
    - 左サイドバー（検索プリセット / 分類フォルダ）
    - 明るいテーマ（.theme-light。画像を読影するビューア/タイムラインは暗いテーマのまま）
    - 検査を選択すると「同一患者IDの全検査」「シリーズリスト」が下に常設表示される
      （以前はポップアップモーダルだったが、実製品に合わせてインラインパネルに変更した）

  【View（ビュー）コンポーネントの役割】
  router/index.ts に登録された「ページ」に対応するコンポーネント。
  以下を担当する:
    1. Store からデータを取得してページに渡す
    2. 各 feature コンポーネントを組み合わせてページを構成する
    3. ページ固有の UI 状態（どの検査が選択されているか等）を管理する
-->

<template>
  <div class="page theme-light">
    <!-- ── ヘッダー ───────────────────────────────────── -->
    <header class="page-header">
      <div class="logo">
        <span class="logo-icon">⬡</span>
        <span class="logo-text">DICOM Tool</span>
      </div>
      <div class="header-actions">
        <span v-if="store.studies.length > 0" class="study-count">
          {{ store.studies.length }} 件
        </span>
        <label class="auto-refresh">
          <input v-model="autoRefresh" type="checkbox" />
          自動更新
        </label>
        <RouterLink :to="{ name: 'upload' }" class="tutorial-link">⬆ アップロード</RouterLink>
        <RouterLink :to="{ name: 'tutorial' }" class="tutorial-link">📘 Vue学習</RouterLink>
        <button class="refresh-btn" :disabled="store.loading" @click="store.fetchStudies()">
          <span :class="{ spinning: store.loading }">↻</span>
          更新
        </button>
        <!-- ログイン状態の表示。認証必須の操作（並べ替え保存等）を使う前にここでログインする。 -->
        <div v-if="authStore.isLoggedIn" class="auth-status">
          <span class="auth-name">
            👤 {{ authStore.displayName }}
            <span v-if="authStore.isAdmin" class="admin-badge">管理者</span>
          </span>
          <button class="auth-link" @click="authStore.logout()">ログアウト</button>
        </div>
        <RouterLink v-else :to="{ name: 'login' }" class="tutorial-link">🔑 ログイン</RouterLink>
      </div>
    </header>

    <!-- ── サイドバー + メインコンテンツ ───────────────── -->
    <div class="page-body">
      <WorklistSidebar @select-preset="handleSelectPreset" />

      <main class="page-main">
        <div class="toolbar">
          <h1 class="section-title">検査一覧</h1>
        </div>

        <!--
          StudyTable は features/study/ のコンポーネント。
          store から取得したデータを Props として渡す。
          イベントは View が受け取り、ローカル状態（selectedStudy）を更新する。
        -->
        <StudyTable
          :studies="store.studies"
          :loading="store.loading"
          :error="store.error"
          :selected-u-i-d="selectedStudy?.studyInstanceUID ?? null"
          @select-study="selectedStudy = $event"
        />

        <!--
          検査を選択すると、実製品と同じく下に「同一患者IDの全検査」
          「シリーズリスト」が常設パネルとして表示される（ポップアップではない）。
        -->
        <PatientHistoryPanel
          v-if="selectedStudy"
          :studies="store.studies"
          :selected-study="selectedStudy"
          @select-study="selectedStudy = $event"
        />
        <SeriesListPanel
          v-if="selectedStudy"
          :key="selectedStudy.studyInstanceUID"
          :study="selectedStudy"
          @open-images="openSeries"
        />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

// Store から取得（@ エイリアスで src/ からの絶対パス）
import { useDicomStore } from '@/stores/dicomStore'
import { useAuthStore } from '@/stores/authStore'

// feature コンポーネント（それぞれ独立した機能モジュール）
import StudyTable from '@/features/study/components/StudyTable.vue'
import WorklistSidebar from '@/features/study/components/WorklistSidebar.vue'
import PatientHistoryPanel from '@/features/study/components/PatientHistoryPanel.vue'
import SeriesListPanel from '@/features/study/components/SeriesListPanel.vue'

import type { DicomStudy, DicomSeries } from '@/types/dicom'

const router = useRouter()

// ── Store の取得 ──────────────────────────────────────
// useDicomStore() を呼ぶだけで Store のインスタンスが得られる。
// Store はシングルトンなので何度呼んでも同じインスタンスが返る。
const store = useDicomStore()
const authStore = useAuthStore()

// ── ページ固有の UI 状態（グローバルでなくていい）──────
// 選択中の検査はこのページだけで使う一時的な状態なので、
// Store ではなくローカルの ref で管理する。
const selectedStudy = ref<DicomStudy | null>(null)

// シリーズがダブルクリックされたら、専用の画像ビューアページへ遷移する。
function openSeries(series: DicomSeries) {
  router.push({ name: 'series-viewer', params: { seriesInstanceUID: series.seriesInstanceUID } })
}

// サイドバーの「全体」を押したら選択状態をリセットする（見た目だけの他項目は今のところ動作なし）。
function handleSelectPreset(name: string) {
  if (name === '全体') {
    selectedStudy.value = null
  }
}

// ── 自動更新（実製品のワークリストにある「自動更新」トグルを再現）──────
// ONの間、一定間隔でfetchStudies()を呼び直す。
const autoRefresh = ref(false)
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

watch(autoRefresh, (enabled) => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
  if (enabled) {
    autoRefreshTimer = setInterval(() => store.fetchStudies(), 30_000)
  }
})

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
})

// ── ライフサイクルフック ──────────────────────────────
// ページが表示されたら自動的に DICOM データを読み込む
onMounted(() => store.fetchStudies())
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 52px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-icon {
  color: var(--color-accent);
  font-size: 1.3rem;
}

.logo-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-heading);
  letter-spacing: 0.03em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.auto-refresh {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  cursor: pointer;
  margin-right: 0.25rem;
}

.tutorial-link {
  font-size: 0.85rem;
  color: var(--color-accent);
  text-decoration: none;
  padding: 0.35rem 0.6rem;
}

.tutorial-link:hover {
  text-decoration: underline;
}

.auth-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 0.25rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--color-border);
}

.auth-name {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.admin-badge {
  font-size: 0.68rem;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border-radius: 10px;
  padding: 1px 7px;
}

.auth-link {
  background: none;
  border: none;
  color: var(--color-accent);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.2rem;
}

.auth-link:hover {
  text-decoration: underline;
}

.refresh-btn {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.35rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: background 0.15s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--color-accent-bg-hover);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  display: inline-block;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.page-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.page-main {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.study-count {
  font-size: 0.78rem;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border-radius: 10px;
  padding: 1px 8px;
}
</style>
