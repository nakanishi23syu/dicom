<!--
  ======================================================
  DragSortUnit.vue — 単元: Notion風ドラッグ&ドロップ並べ替え
  ======================================================
  ここで学ぶこと:
    - composables/useDragSort.ts を検査・シリーズ・SOPの3つの一覧で使い回す
    - 「並べ替え保存」でbackendのOrderカラムに書き込み、「並べ替え適用」で
      保存済みのOrderを使って表示順を切り替える、という2段階の設計
    - HTML標準の draggable 属性だけでライブラリ無しの並べ替えを実装する方法

  backend/DicomLearning.GraphQL のシードデータ（検査3件・複数シリーズ・複数SOP）を
  そのまま使い、実際にドラッグ→保存→適用まで一通り試せるデモ。
  事前に `cd backend/DicomLearning.GraphQL && dotnet run` でバックエンドを起動しておくこと。
-->

<template>
  <TutorialUnitShell
    title="単元: Notion風ドラッグ&ドロップ並べ替え"
    subtitle="useDragSort composable を検査・シリーズ・SOPの3階層で共通利用する"
  >
    <div class="demo-block">
      <p class="lead">
        行をドラッグして並べ替え →
        <strong>並べ替え保存</strong>
        でbackendのOrderカラムに反映 →
        <strong>並べ替え適用</strong>
        で保存済みの順番を表示に反映、という流れを試せる。
      </p>
      <p v-if="loading" class="status-line">読み込み中…</p>
      <p v-if="errorMessage" class="status-line error">{{ errorMessage }}</p>

      <!-- ── 検査一覧（1階層目） ── -->
      <section class="list-section">
        <div class="list-header">
          <h3>検査一覧（reorderStudies）</h3>
          <div class="control-row">
            <BaseButton variant="secondary" @click="applyOrder(studies)">
              並べ替え適用
            </BaseButton>
            <SaveButton @click="saveStudyOrder">並べ替え保存</SaveButton>
          </div>
        </div>
        <ul class="drag-list">
          <li
            v-for="(study, index) in studies"
            :key="study.studyInstanceUid"
            class="drag-row"
            :class="{ selected: selectedStudyIndex === index, dragging: draggingStudyIndex === index }"
            v-bind="studyDragHandlers(index)"
            @click="selectStudy(index)"
          >
            <span class="drag-handle">⠿</span>
            <span class="drag-label">{{ study.patientName }} / {{ study.studyDescription }}</span>
            <span class="drag-order">order: {{ study.order }}</span>
          </li>
        </ul>
      </section>

      <!-- ── シリーズ一覧（2階層目、選択中の検査のもの） ── -->
      <section v-if="selectedStudy" class="list-section">
        <div class="list-header">
          <h3>シリーズ一覧（reorderSeries） — {{ selectedStudy.patientName }}</h3>
          <div class="control-row">
            <BaseButton variant="secondary" @click="applyOrder(seriesOfSelectedStudy)">
              並べ替え適用
            </BaseButton>
            <SaveButton @click="saveSeriesOrder">並べ替え保存</SaveButton>
          </div>
        </div>
        <ul class="drag-list">
          <li
            v-for="(series, index) in seriesOfSelectedStudy"
            :key="series.seriesInstanceUid"
            class="drag-row"
            :class="{
              selected: selectedSeriesIndex === index,
              dragging: draggingSeriesIndex === index,
            }"
            v-bind="seriesDragHandlers(index)"
            @click="selectSeries(index)"
          >
            <span class="drag-handle">⠿</span>
            <span class="drag-label">{{ series.seriesDescription || '説明なし' }}</span>
            <span class="drag-order">order: {{ series.order }}</span>
          </li>
        </ul>
      </section>

      <!-- ── SOP（画像）一覧（3階層目、選択中のシリーズのもの） ── -->
      <section v-if="selectedSeries" class="list-section">
        <div class="list-header">
          <h3>SOP（画像）一覧（reorderSops）</h3>
          <div class="control-row">
            <BaseButton variant="secondary" @click="applyOrder(sopsOfSelectedSeries)">
              並べ替え適用
            </BaseButton>
            <SaveButton @click="saveSopOrder">並べ替え保存</SaveButton>
          </div>
        </div>
        <ul class="drag-list">
          <li
            v-for="(sop, index) in sopsOfSelectedSeries"
            :key="sop.sopInstanceUid"
            class="drag-row"
            :class="{ dragging: draggingSopIndex === index }"
            v-bind="sopDragHandlers(index)"
          >
            <span class="drag-handle">⠿</span>
            <span class="drag-label">{{ sop.filePath }}</span>
            <span class="drag-order">order: {{ sop.order }}</span>
          </li>
        </ul>
      </section>
    </div>

    <template #analogy>
      <p>
        Notionのページ内ブロックを「::」ハンドルでつまんで並べ替えるのと同じ操作感を、
        3種類のリスト（検査・シリーズ・SOP）それぞれに実装するのではなく、
        <code>useDragSort</code>
        という「並べ替えの型紙」を1つ作って使い回している。
      </p>
    </template>

    <template #react>
      <p>
        react-beautiful-dnd等のライブラリを使わず、ブラウザ標準の
        <code>draggable</code>
        属性 + dragstart/dragover/dropイベントだけで実装している。Reactでも考え方は同じで、
        「ドラッグ中indexをuseStateで持ち、dropで配列をsplice入れ替えする」処理を
        カスタムフック（useDragSort相当）に切り出せば同様に共通化できる。
      </p>
    </template>
  </TutorialUnitShell>

  <NotificationModal v-model="showSaveResult" title="並べ替え保存">
    {{ saveResultMessage }}
  </NotificationModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import SaveButton from '@/components/common/SaveButton.vue'
import NotificationModal from '@/components/common/NotificationModal.vue'
import { useDragSort } from '@/composables/useDragSort'
import {
  fetchStudies,
  reorderStudies,
  reorderSeries,
  reorderSops,
  type GraphQLStudy,
  type GraphQLSeries,
  type GraphQLSop,
} from '@/services/backendApiService'

const studies = ref<GraphQLStudy[]>([])
const loading = ref(false)
const errorMessage = ref('')

const selectedStudyIndex = ref<number | null>(null)
const selectedSeriesIndex = ref<number | null>(null)

const selectedStudy = computed<GraphQLStudy | null>(() =>
  selectedStudyIndex.value !== null ? (studies.value[selectedStudyIndex.value] ?? null) : null
)
const selectedSeries = computed<GraphQLSeries | null>(() =>
  selectedSeriesIndex.value !== null
    ? (seriesOfSelectedStudy.value[selectedSeriesIndex.value] ?? null)
    : null
)

// ======================================================
// useDragSort は Ref<T[]> を受け取る想定なので、
// 「選択中の検査のシリーズ配列」「選択中のシリーズのSOP配列」は
// getter/setterを持つ書き込み可能なcomputedとして渡している。
// set側で元データ（studies配列の中の該当要素）を書き換えることで、
// useDragSort内部の `items.value = next` がそのまま反映される。
// ======================================================
const seriesOfSelectedStudy = computed<GraphQLSeries[]>({
  get: () => selectedStudy.value?.series ?? [],
  set: (next) => {
    if (selectedStudy.value) selectedStudy.value.series = next
  },
})

const sopsOfSelectedSeries = computed<GraphQLSop[]>({
  get: () => selectedSeries.value?.sops ?? [],
  set: (next) => {
    if (selectedSeries.value) selectedSeries.value.sops = next
  },
})

const { draggingIndex: draggingStudyIndex, dragHandlers: studyDragHandlers } =
  useDragSort(studies)
const { draggingIndex: draggingSeriesIndex, dragHandlers: seriesDragHandlers } =
  useDragSort(seriesOfSelectedStudy)
const { draggingIndex: draggingSopIndex, dragHandlers: sopDragHandlers } =
  useDragSort(sopsOfSelectedSeries)

function selectStudy(index: number) {
  selectedStudyIndex.value = index
  selectedSeriesIndex.value = null
}

function selectSeries(index: number) {
  selectedSeriesIndex.value = index
}

async function loadStudies() {
  loading.value = true
  errorMessage.value = ''
  try {
    studies.value = await fetchStudies()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

// 「並べ替え適用」: ドラッグで並べ替える前の状態に戻したいとき、
// 保存済みのorder値（サーバー基準の正の並び順）を使って表示を並べ直す。
function applyOrder<T extends { order: number }>(items: T[]) {
  items.sort((a, b) => a.order - b.order)
}

async function saveStudyOrder() {
  const matched = await reorderStudies(studies.value.map((s) => s.studyInstanceUid))
  // 保存直後にサーバー側の新しいorder値をローカルにも反映しておく（0始まりの連番）。
  studies.value.forEach((s, i) => (s.order = i))
  showSaveResultMessage(`検査の並び順を保存しました（${matched}件更新）`)
}

async function saveSeriesOrder() {
  const matched = await reorderSeries(seriesOfSelectedStudy.value.map((s) => s.seriesInstanceUid))
  seriesOfSelectedStudy.value.forEach((s, i) => (s.order = i))
  showSaveResultMessage(`シリーズの並び順を保存しました（${matched}件更新）`)
}

async function saveSopOrder() {
  const matched = await reorderSops(sopsOfSelectedSeries.value.map((s) => s.sopInstanceUid))
  sopsOfSelectedSeries.value.forEach((s, i) => (s.order = i))
  showSaveResultMessage(`SOPの並び順を保存しました（${matched}件更新）`)
}

const showSaveResult = ref(false)
const saveResultMessage = ref('')
function showSaveResultMessage(message: string) {
  saveResultMessage.value = message
  showSaveResult.value = true
}

onMounted(loadStudies)
</script>

<style scoped>
.lead {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.status-line {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.status-line.error {
  color: var(--color-danger);
}

.list-section {
  margin-top: 1.25rem;
}

.list-section:first-of-type {
  margin-top: 0;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.list-header h3 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-heading);
}

.control-row {
  display: flex;
  gap: 0.5rem;
}

.drag-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.drag-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  cursor: grab;
  transition:
    border-color 0.15s,
    opacity 0.15s;
}

.drag-row:active {
  cursor: grabbing;
}

/* ドラッグ中の行は半透明にして「今つまんでいる」ことを視覚的に示す */
.drag-row.dragging {
  opacity: 0.4;
}

.drag-row.selected {
  border-color: var(--color-border-strong);
  background: var(--color-accent-bg);
}

.drag-handle {
  color: var(--color-text-faint);
  flex-shrink: 0;
}

.drag-label {
  flex: 1;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drag-order {
  color: var(--color-text-muted);
  font-family: monospace;
  font-size: 0.72rem;
  flex-shrink: 0;
}
</style>
