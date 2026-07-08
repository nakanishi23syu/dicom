<!--
  ======================================================
  views/SeriesViewerView.vue — 画像ビューアページ
  ======================================================
  ルート "/viewer/:seriesInstanceUID" に対応するページ。
  URLパラメータから対象のシリーズを Store の中から探し出し、
  features/image-viewer/components/SeriesViewer.vue に Props として渡す。

  【なぜ View 側でシリーズを解決するのか】
  SeriesViewer.vue（featureコンポーネント）は「Propsで受け取ったシリーズを表示する」
  ことだけに専念させたい。「URLからどうシリーズを探すか」というルーティング関連の
  関心事は View（ページ）の責務として切り離す。

  また、このページへは StudyListView を経由せず直接URLアクセスされる可能性もある
  （リロード・ブックマーク等）ため、Store が空なら自前でロードし直す。
-->

<template>
  <div class="page">
    <header class="page-header">
      <RouterLink :to="{ name: 'study-list' }" class="back-link">← 検査一覧に戻る</RouterLink>
      <div v-if="series">
        <h1>{{ series.seriesDescription || `Series ${series.seriesNumber}` }}</h1>
        <p class="subtitle">{{ series.modality || '—' }}</p>
      </div>
    </header>

    <main class="page-main">
      <div v-if="store.loading" class="state-msg">
        <span class="spinner" />
        読み込み中...
      </div>
      <div v-else-if="!series" class="state-msg error">
        指定されたシリーズが見つかりませんでした。
      </div>
      <SeriesViewer v-else :series="series" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDicomStore } from '@/stores/dicomStore'
import SeriesViewer from '@/features/image-viewer/components/SeriesViewer.vue'

const route = useRoute()
const store = useDicomStore()

// このページへ直接アクセスされた場合（リロード等）に備え、
// Store が未読み込みなら自分でロードする。
onMounted(() => {
  if (store.studies.length === 0) store.fetchStudies()
})

// ルートパラメータの seriesInstanceUID と一致するシリーズを、
// 全 Study を横断して探す。UID はDICOM上グローバルに一意なので
// studyInstanceUID を経由せず seriesInstanceUID だけで特定できる。
const series = computed(() => {
  const uid = route.params.seriesInstanceUID as string
  for (const study of store.studies) {
    const found = study.series.find((s) => s.seriesInstanceUID === uid)
    if (found) return found
  }
  return null
})
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 0.85rem 1.5rem;
  background: #111827;
  border-bottom: 1px solid #1e2535;
  flex-shrink: 0;
}

.back-link {
  display: inline-block;
  font-size: 0.8rem;
  color: #7eb8f7;
  text-decoration: none;
  margin-bottom: 0.4rem;
}

.back-link:hover {
  text-decoration: underline;
}

.page-header h1 {
  margin: 0;
  font-size: 1rem;
  color: #e2e8f0;
}

.subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  color: #8b9ab3;
}

.page-main {
  flex: 1;
  overflow: hidden;
}

.state-msg {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #8b9ab3;
}

.state-msg.error {
  color: #f87171;
}

.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #2a3f5f;
  border-top-color: #7eb8f7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
