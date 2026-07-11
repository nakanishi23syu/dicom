<!--
  ======================================================
  views/StudyListView.vue — 検査一覧ページ
  ======================================================
  【View（ビュー）コンポーネントの役割】
  router/index.ts に登録された「ページ」に対応するコンポーネント。
  以下を担当する:
    1. Store からデータを取得してページに渡す
    2. 各 feature コンポーネントを組み合わせてページを構成する
    3. ページ固有の UI 状態（どの検査が選択されているか等）を管理する

  features/ のコンポーネントはデータの「見た目」を担当するが、
  View はそれらを「どう配置・連携させるか」を担当する。
  この分離により features/ のコンポーネントが再利用しやすくなる。
-->

<template>
  <div class="page">
    <!-- ── ヘッダー ───────────────────────────────────── -->
    <header class="page-header">
      <div class="logo">
        <span class="logo-icon">⬡</span>
        <span class="logo-text">DICOM Tool</span>
      </div>
      <div class="header-actions">
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

    <!-- ── メインコンテンツ ───────────────────────────── -->
    <main class="page-main">
      <div class="toolbar">
        <h1 class="section-title">検査一覧</h1>
        <span v-if="store.studies.length > 0" class="study-count">
          {{ store.studies.length }} 件
        </span>
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
    </main>

    <!--
      モーダルはページ固有の UI なのでここで管理する。
      selectedStudy が null でなければ SeriesModal を表示する。
    -->
    <SeriesModal
      v-if="selectedStudy"
      :study="selectedStudy"
      @close="selectedStudy = null"
      @open-images="openSeries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Store から取得（@ エイリアスで src/ からの絶対パス）
import { useDicomStore } from '@/stores/dicomStore'
import { useAuthStore } from '@/stores/authStore'

// feature コンポーネント（それぞれ独立した機能モジュール）
import StudyTable from '@/features/study/components/StudyTable.vue'
import SeriesModal from '@/features/series/components/SeriesModal.vue'
// 旧 features/viewer/components/ImageViewer.vue はファイルとして残しているが、
// 新しい画像ビューア（/viewer/:seriesInstanceUID ページ）に役目を譲ったためここでは参照しない。

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

// シリーズがダブルクリックされたら、モーダルではなく専用ページへ遷移する。
function openSeries(series: DicomSeries) {
  router.push({ name: 'series-viewer', params: { seriesInstanceUID: series.seriesInstanceUID } })
}

// ── ライフサイクルフック ──────────────────────────────
// ページが表示されたら自動的に DICOM データを読み込む
onMounted(() => store.fetchStudies())
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
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
