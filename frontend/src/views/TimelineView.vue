<!--
  ======================================================
  views/TimelineView.vue — 患者タイムラインビュー（比較読影支援）
  ======================================================
  関連用語集.md にある「タイムラインビュー」「比較読影」の実装。
  実際のSYNAPSE LEADのタイムライン画面（モダリティごとの行×検査日を横に並べる構成）
  に近づけている。暗いテーマを使っているのも実製品と同じ
  （読影は周囲を暗くした部屋で行うことが多く、暗い画面の方が画像を見やすいため。
  指示書2.md要望3により、現在は検査一覧を含むアプリ全体がこの暗いテーマで統一されている）。

  backend/DicomLearning.GraphQL の patientTimeline クエリを使う。
  検査一覧（StudyTable.vue）も同じbackend DBから取得するようになったため、
  「backendに登録済みの患者」であれば検査一覧・タイムラインの両方から同じデータが見える。

  backend側には「保存済みDICOMファイルを画像として配信するAPI」（/dicom-files、
  Program.cs参照）があるが、このタイムラインは実製品のような代表画像サムネイルではなく、
  一覧性を優先してモダリティ別の色付きブロックで検査を表す簡易表示のままにしている。
-->

<template>
  <div class="page">
    <header class="page-header">
      <div class="header-left">
        <RouterLink :to="{ name: 'study-list' }" class="back-link">← 検査一覧に戻る</RouterLink>
        <h1>タイムライン</h1>
        <p class="patient-line">
          患者ID
          <code>{{ patientId }}</code>
          <span v-if="studies.length > 0">
            　{{ studies[0].patientName }}　{{ formatDate(studies[0].studyDate) }}時点
          </span>
        </p>
      </div>
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

      <div v-else class="timeline-grid">
        <!-- 日付軸（実製品の上部にある目盛りバーを簡易的に再現） -->
        <div class="axis-row">
          <div class="row-label" />
          <div class="axis-track">
            <span v-for="date in sortedDates" :key="date" class="axis-tick" />
          </div>
        </div>

        <!-- モダリティごとの行。各行の中に、そのモダリティの検査が古い順に並ぶ -->
        <div v-for="group in modalityGroups" :key="group.modality" class="modality-row">
          <div class="row-label">
            <span class="row-modality">{{ group.modality || '不明' }}</span>
            <span class="row-count">{{ group.studies.length }}件</span>
          </div>
          <div class="row-track">
            <button
              v-for="study in group.studies"
              :key="study.studyInstanceUid"
              type="button"
              class="study-chip"
              :class="{ selected: study.studyInstanceUid === selectedStudyUid }"
              @click="selectedStudyUid = study.studyInstanceUid"
            >
              <span class="chip-date">{{ formatDate(study.studyDate) }}</span>
              <span class="chip-desc">{{ study.studyDescription || '説明なし' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 選択中の検査の詳細（比較読影のために2件並べて見比べられるようにする） -->
      <section v-if="selectedStudy" class="compare-section">
        <h2>比較読影</h2>
        <div class="compare-columns">
          <div class="compare-card">
            <p class="compare-label">選択中</p>
            <p class="compare-date">{{ formatDate(selectedStudy.studyDate) }}</p>
            <p class="compare-desc">{{ selectedStudy.studyDescription || '説明なし' }}</p>
            <p class="compare-meta">
              {{ selectedStudy.modality }} / {{ selectedStudy.series.length }} シリーズ
            </p>
          </div>
          <div v-if="priorStudy" class="compare-card">
            <p class="compare-label">直前の検査</p>
            <p class="compare-date">{{ formatDate(priorStudy.studyDate) }}</p>
            <p class="compare-desc">{{ priorStudy.studyDescription || '説明なし' }}</p>
            <p class="compare-meta">
              {{ priorStudy.modality }} / {{ priorStudy.series.length }} シリーズ
            </p>
          </div>
          <div v-else class="compare-card empty">
            <p class="compare-label">比較対象となる過去検査はありません</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { fetchPatientTimeline } from '@/services/backendApiService'
import type { GraphQLStudy } from '@/services/backendApiService'

const route = useRoute()
const patientId = route.params.patientId as string

const studies = ref<GraphQLStudy[]>([])
const loading = ref(false)
const errorMessage = ref('')
const selectedStudyUid = ref<string | null>(null)

// backendの検査日は "YYYYMMDD" ではなく ISO形式の日付文字列（DateOnlyのJSONシリアライズ結果）で返る。
function formatDate(raw: string): string {
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

// モダリティごとに行を分け、各行の中では検査日の古い順（左→右）に並べる
// （実製品のタイムラインは左が過去・右が現在という時系列の流れになっているため）。
const modalityGroups = computed(() => {
  const byModality = new Map<string, GraphQLStudy[]>()
  for (const study of studies.value) {
    const key = study.modality || '不明'
    if (!byModality.has(key)) byModality.set(key, [])
    byModality.get(key)!.push(study)
  }
  return [...byModality.entries()]
    .map(([modality, list]) => ({
      modality,
      studies: [...list].sort((a, b) => a.studyDate.localeCompare(b.studyDate)),
    }))
    .sort((a, b) => a.modality.localeCompare(b.modality))
})

const sortedDates = computed(() =>
  [...new Set(studies.value.map((s) => s.studyDate))].sort((a, b) => a.localeCompare(b))
)

const selectedStudy = computed(
  () => studies.value.find((s) => s.studyInstanceUid === selectedStudyUid.value) ?? null
)

// 「直前の検査」＝選択中の検査より前の日付の中で最も新しいもの（比較読影の対象）。
const priorStudy = computed(() => {
  if (!selectedStudy.value) return null
  const earlier = studies.value
    .filter((s) => s.studyDate < selectedStudy.value!.studyDate)
    .sort((a, b) => b.studyDate.localeCompare(a.studyDate))
  return earlier[0] ?? null
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    studies.value = await fetchPatientTimeline(patientId)
    // 実製品も開いた直後は最新検査が選択された状態になる（studiesは新しい順で返る）。
    selectedStudyUid.value = studies.value[0]?.studyInstanceUid ?? null
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

.patient-line {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.patient-line code {
  background: var(--color-bg);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--color-accent);
}

.page-main {
  flex: 1;
  padding: 1.5rem;
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

/* ── 横型タイムライングリッド ── */
.timeline-grid {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  overflow-x: auto;
}

.axis-row,
.modality-row {
  display: flex;
  align-items: center;
  min-height: 2.6rem;
}

.axis-row {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.5rem;
  margin-bottom: 0.25rem;
}

.modality-row + .modality-row {
  border-top: 1px solid var(--color-border);
}

.row-label {
  width: 110px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.row-modality {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-heading);
}

.row-count {
  font-size: 0.68rem;
  color: var(--color-text-faint);
}

.axis-track,
.row-track {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  overflow-x: auto;
}

.axis-tick {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border-strong);
  flex-shrink: 0;
}

.study-chip {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  background: var(--color-accent-bg);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  min-width: 110px;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.study-chip:hover {
  background: var(--color-accent-bg-hover);
}

.study-chip.selected {
  border-color: var(--color-accent);
  background: var(--color-accent-selected-bg);
}

.chip-date {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-accent);
}

.chip-desc {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

/* ── 比較読影セクション ── */
.compare-section {
  margin-top: 1.5rem;
}

.compare-section h2 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  color: var(--color-text-heading);
}

.compare-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 1rem;
}

.compare-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem 1.1rem;
}

.compare-card.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-faint);
  font-size: 0.8rem;
}

.compare-label {
  margin: 0 0 0.35rem;
  font-size: 0.7rem;
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.compare-date {
  margin: 0 0 0.2rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-heading);
}

.compare-desc {
  margin: 0 0 0.3rem;
  font-size: 0.85rem;
  color: var(--color-text);
}

.compare-meta {
  margin: 0;
  font-size: 0.76rem;
  color: var(--color-text-muted);
}
</style>
