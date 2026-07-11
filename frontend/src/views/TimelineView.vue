<!--
  ======================================================
  views/TimelineView.vue — 患者タイムラインビュー（比較読影支援）
  ======================================================
  関連用語集.md にある「タイムラインビュー」「比較読影」の実装。
  同一患者IDの過去検査を新しい順に並べ、隣り合う検査を見比べやすくする。

  backend/DicomLearning.GraphQL の patientTimeline クエリを使う。
  検査一覧（StudyTable.vue）はまだ frontend側で public/dicom/manifest.json を
  直接パースしたデータを表示しており backend DB とは別データのため、
  「/upload でアップロード済みの患者」でないとここには何も表示されない
  （アップロードすると同じ患者IDでbackendに登録されるため、そこで初めて繋がる）。
-->

<template>
  <div class="page">
    <header class="page-header">
      <RouterLink :to="{ name: 'study-list' }" class="back-link">← 検査一覧に戻る</RouterLink>
      <h1>患者タイムライン（比較読影）</h1>
      <p class="page-desc">
        患者ID <code>{{ patientId }}</code> の検査を新しい順に表示します。
        隣り合う検査を見比べて経過を確認できます。
      </p>
    </header>

    <main class="page-main">
      <p v-if="loading" class="status-line">読み込み中…</p>
      <p v-else-if="errorMessage" class="status-line error">{{ errorMessage }}</p>

      <div v-else-if="studies.length === 0" class="empty-state">
        <p>この患者IDの検査はbackendにまだ登録されていません。</p>
        <p class="hint">
          <RouterLink :to="{ name: 'upload' }">/upload</RouterLink>
          からDICOMファイルをアップロードすると、ここにタイムラインとして表示されます。
        </p>
      </div>

      <ol v-else class="timeline">
        <li v-for="(study, index) in studies" :key="study.studyInstanceUid" class="timeline-item">
          <div class="timeline-marker">
            <span class="timeline-dot" />
            <span v-if="index < studies.length - 1" class="timeline-line" />
          </div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <span class="timeline-date">{{ formatDate(study.studyDate) }}</span>
              <span class="badge">{{ study.modality || '—' }}</span>
              <span v-if="index === 0" class="latest-badge">最新</span>
            </div>
            <p class="timeline-desc">{{ study.studyDescription || '説明なし' }}</p>
            <p class="timeline-meta">
              {{ study.series.length }} シリーズ / アクセッション番号:
              {{ study.accessionNumber || '—' }}
            </p>

            <!-- 直前の検査（1つ古い方）との比較読影を意識した注記 -->
            <p v-if="index < studies.length - 1" class="compare-hint">
              ↓ {{ formatDate(studies[index + 1].studyDate) }} の検査と比較読影する
            </p>
          </div>
        </li>
      </ol>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPatientTimeline } from '@/services/backendApiService'
import type { GraphQLStudy } from '@/services/backendApiService'

const route = useRoute()
const patientId = route.params.patientId as string

const studies = ref<GraphQLStudy[]>([])
const loading = ref(false)
const errorMessage = ref('')

// backendの検査日は "YYYYMMDD" ではなく ISO形式の日付文字列（DateOnlyのJSONシリアライズ結果）で返る。
function formatDate(raw: string): string {
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    studies.value = await fetchPatientTimeline(patientId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.back-link {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--color-accent);
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.back-link:hover {
  text-decoration: underline;
}

.page-header h1 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-heading);
}

.page-desc {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.page-desc code {
  background: var(--color-bg);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--color-accent);
}

.page-main {
  flex: 1;
  padding: 1.5rem;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
}

.status-line {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.status-line.error {
  color: var(--color-danger);
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.88rem;
}

.empty-state .hint {
  margin-top: 0.5rem;
  font-size: 0.8rem;
}

.empty-state a {
  color: var(--color-accent);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.timeline-item {
  display: flex;
  gap: 1rem;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
  margin-top: 0.4rem;
  flex-shrink: 0;
}

.timeline-line {
  flex: 1;
  width: 2px;
  background: var(--color-border-strong);
  margin: 0.25rem 0;
}

.timeline-card {
  flex: 1;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.9rem 1.1rem;
  margin-bottom: 1.25rem;
}

.timeline-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.timeline-date {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-heading);
}

.latest-badge {
  font-size: 0.68rem;
  background: var(--color-success-bg);
  color: var(--color-success);
  border-radius: 10px;
  padding: 1px 7px;
}

.badge {
  display: inline-block;
  background: var(--color-border-strong);
  color: var(--color-accent);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.72rem;
  font-weight: 600;
}

.timeline-desc {
  margin: 0 0 0.3rem;
  font-size: 0.88rem;
  color: var(--color-text);
}

.timeline-meta {
  margin: 0;
  font-size: 0.76rem;
  color: var(--color-text-muted);
}

.compare-hint {
  margin: 0.5rem 0 0;
  font-size: 0.76rem;
  color: var(--color-text-faint);
  font-style: italic;
}
</style>
