<!--
  ======================================================
  SopListPanel.vue — 「SOP（画像）一覧」パネル
  ======================================================
  SeriesListPanel.vue で選択中のシリーズに含まれる画像（SOP Instance）を
  Notion風にドラッグ&ドロップで並べ替えられる一覧として表示する。
  StudyTable.vue（検査一覧）・SeriesListPanel.vue（シリーズ一覧）と同じ
  「ドラッグで並べ替え → 保存でDBのOrderカラムへ反映 → 適用でDB順に戻す」の
  パターンを、共通のcomposable（useReorderable・useDragSort）で実現している。
-->

<template>
  <section class="sop-panel">
    <div class="panel-header">
      <span class="panel-title">▼ SOP（画像）一覧</span>
      <span class="panel-count">件数：{{ series.instances.length }}</span>
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

    <table class="sop-table">
      <thead>
        <tr>
          <th class="drag-col" />
          <th>画像番号</th>
          <th>SOP Instance UID</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(instance, index) in reorder.workingItems.value"
          :key="instance.sopInstanceUID"
          class="sop-row"
          :class="{ dragging: draggingIndex === index }"
          v-bind="dragHandlers(index)"
        >
          <td class="drag-col">
            <span class="drag-handle" title="ドラッグで並べ替え">⠿</span>
          </td>
          <td>{{ instance.instanceNumber || '—' }}</td>
          <td class="uid-cell">{{ instance.sopInstanceUID }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DicomSeries, DicomInstance } from '@/types/dicom'
import { useAuthStore } from '@/stores/authStore'
import { useDragSort } from '@/composables/useDragSort'
import { useReorderable } from '@/composables/useReorderable'
import { reorderSops } from '@/services/backendApiService'

const props = defineProps<{
  series: DicomSeries
}>()

const authStore = useAuthStore()

// 呼び出し側で :key="series.seriesInstanceUID" を付けてもらう想定
// （シリーズが切り替わるとこのコンポーネント自体が再マウントされ、
// 前のシリーズの未保存ドラッグ状態を引きずらない）。
const instances = computed(() => props.series.instances)
const reorder = useReorderable(
  instances,
  (i: DicomInstance) => i.sopInstanceUID,
  (i: DicomInstance) => i.order
)

const { draggingIndex, dragHandlers } = useDragSort(reorder.workingItems)

async function handleSaveOrder() {
  try {
    await reorder.save(reorderSops)
  } catch {
    // reorder.saveError が画面に表示されるため、ここでは追加のハンドリング不要。
  }
}
</script>

<style scoped>
.sop-panel {
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

.sop-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.sop-table th,
.sop-table td {
  padding: 0.4rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.sop-table th {
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
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

.sop-row {
  color: var(--color-text);
  background: var(--color-surface);
  transition: background 0.15s;
}

.sop-row.dragging {
  opacity: 0.4;
}

.uid-cell {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
