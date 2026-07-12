<!--
  ======================================================
  SeriesListPanel.vue — 「シリーズリスト」パネル（インライン表示）
  ======================================================
  SYNAPSE LEADの検査一覧最下部にある「シリーズリスト」を再現したもの。
  以前はポップアップモーダル（SeriesModal.vue）で表示していたが、
  実製品に合わせて検査一覧の下に常設パネルとして表示する形に変更した。

  行を選択すると右側にサムネイル（そのシリーズの代表画像）を描画する。
  ダブルクリックで画像ビューアページを開く（従来のSeriesModalと同じ操作性）。
-->

<template>
  <section class="series-panel">
    <div class="panel-header">
      <span class="panel-title">▼ シリーズリスト</span>
      <span class="panel-count">件数：{{ study.series.length }}</span>
      <span class="reorder-actions">
        <button
          class="reorder-btn"
          :disabled="!authStore.isAdmin || reorder.saving.value"
          :title="authStore.isAdmin ? '現在の並び順をDBに保存します' : '管理者のみ保存できます'"
          @click="handleSaveOrder"
        >
          💾 保存
        </button>
        <button class="reorder-btn" :disabled="reorder.saving.value" @click="reorder.apply()">
          ↺ 適用
        </button>
        <span v-if="reorder.dirty.value" class="dirty-hint">未保存</span>
        <span v-if="reorder.saveError.value" class="reorder-error">{{ reorder.saveError.value }}</span>
      </span>
    </div>

    <div class="panel-body">
      <table class="series-table">
        <thead>
          <tr>
            <th class="drag-col" />
            <th>シリーズ番号</th>
            <th>モダリティ</th>
            <th>画像数</th>
            <th>シリーズ記述</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(series, index) in reorder.workingItems.value"
            :key="series.seriesInstanceUID"
            class="series-row"
            :class="{
              selected: series.seriesInstanceUID === selectedSeriesUID,
              dragging: draggingIndex === index,
            }"
            v-bind="dragHandlers(index)"
            @click="selectSeries(series)"
            @dblclick="$emit('open-images', series)"
          >
            <td class="drag-col" @click.stop>
              <span class="drag-handle" title="ドラッグで並べ替え">⠿</span>
            </td>
            <td>{{ series.seriesNumber || '—' }}</td>
            <td>{{ series.modality || '—' }}</td>
            <td>{{ series.numberOfInstances }}</td>
            <td>{{ series.seriesDescription || '説明なし' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 選択中シリーズの代表画像サムネイル（実製品の右下プレビューを再現） -->
      <div class="thumbnail-preview">
        <canvas ref="canvasEl" class="preview-canvas" />
        <p v-if="!selectedSeries" class="preview-hint">シリーズを選択</p>
        <p v-else-if="thumbnailError" class="preview-error">画像を読み込めませんでした</p>
        <p class="preview-caption">ダブルクリックで画像を開く</p>
      </div>
    </div>

    <!-- 選択中シリーズのSOP（画像）一覧。シリーズが変わるたびに:keyで再マウントし、
         前のシリーズの未保存ドラッグ状態を引きずらないようにする。 -->
    <SopListPanel v-if="selectedSeries" :key="selectedSeries.seriesInstanceUID" :series="selectedSeries" />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { renderDicomToCanvas } from '@/services/dicomService'
import { useAuthStore } from '@/stores/authStore'
import { useDragSort } from '@/composables/useDragSort'
import { useReorderable } from '@/composables/useReorderable'
import { reorderSeries } from '@/services/backendApiService'
import SopListPanel from './SopListPanel.vue'
import type { DicomStudy, DicomSeries } from '@/types/dicom'

const props = defineProps<{
  study: DicomStudy
}>()

defineEmits<{
  'open-images': [series: DicomSeries]
}>()

const authStore = useAuthStore()
const studySeries = computed(() => props.study.series)
const reorder = useReorderable(
  studySeries,
  (s: DicomSeries) => s.seriesInstanceUID,
  (s: DicomSeries) => s.order
)
const { draggingIndex, dragHandlers } = useDragSort(reorder.workingItems)

async function handleSaveOrder() {
  try {
    await reorder.save(reorderSeries)
  } catch {
    // reorder.saveError が画面に表示されるため、ここでは追加のハンドリング不要。
  }
}

const selectedSeries = ref<DicomSeries | null>(null)
const selectedSeriesUID = ref<string | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const thumbnailError = ref(false)

function selectSeries(series: DicomSeries) {
  selectedSeries.value = series
  selectedSeriesUID.value = series.seriesInstanceUID
}

async function renderPreview() {
  thumbnailError.value = false
  const series = selectedSeries.value
  const canvas = canvasEl.value
  const firstInstance = series?.instances[0]
  if (!series || !canvas || !firstInstance) return

  try {
    await renderDicomToCanvas(firstInstance.filePath, canvas)
  } catch {
    thumbnailError.value = true
  }
}

watch(selectedSeries, renderPreview)

// パネルが表示されたら最初のシリーズを自動選択しておく（実製品もリスト先頭が選択された状態で開く）。
onMounted(() => {
  if (props.study.series.length > 0) {
    selectSeries(props.study.series[0])
  }
})
</script>

<style scoped>
.series-panel {
  border-top: 4px solid var(--color-border);
  background: var(--color-surface);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-heading);
}

.panel-count {
  font-size: 0.75rem;
  color: var(--color-text-faint);
}

.reorder-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.reorder-btn {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  white-space: nowrap;
}

.reorder-btn:hover:not(:disabled) {
  background: var(--color-accent-bg-hover);
}

.reorder-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dirty-hint {
  font-size: 0.72rem;
  color: var(--color-warning);
  white-space: nowrap;
}

.reorder-error {
  font-size: 0.72rem;
  color: var(--color-danger);
}

.drag-col {
  width: 1.5rem;
  padding-left: 0.75rem !important;
  padding-right: 0 !important;
}

.drag-handle {
  color: var(--color-text-faint);
  cursor: grab;
}

.series-row.dragging {
  opacity: 0.4;
}

.panel-body {
  display: flex;
  align-items: stretch;
}

.series-table {
  flex: 1;
  border-collapse: collapse;
  font-size: 0.8rem;
  min-width: 0;
}

.series-table th,
.series-table td {
  padding: 0.4rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.series-table th {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.series-row {
  cursor: pointer;
  color: var(--color-text);
  background: var(--color-surface);
  transition: background 0.15s;
}

.series-row:hover {
  background: var(--color-surface-alt);
}

.series-row.selected {
  background: var(--color-accent-selected-bg);
  color: var(--color-accent);
}

.thumbnail-preview {
  position: relative;
  width: 160px;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  background: var(--color-canvas-bg);
  border-left: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-canvas {
  max-width: 100%;
  max-height: 100%;
}

.preview-hint,
.preview-error {
  position: absolute;
  font-size: 0.72rem;
  color: var(--color-text-disabled);
}

.preview-error {
  color: var(--color-danger);
}

.preview-caption {
  position: absolute;
  bottom: 2px;
  font-size: 0.62rem;
  color: var(--color-text-disabled);
}
</style>
