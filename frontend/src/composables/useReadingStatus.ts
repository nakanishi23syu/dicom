// ======================================================
// composables/useReadingStatus.ts — 検査ごとの読影ステータス管理
// ======================================================
// 実際のPACS製品の検査一覧にある「読影ステータス」列（未記入/記入中/一時保存/最終確定）を
// 再現するための状態管理。
//
// 【なぜbackendではなくlocalStorageで持つか】
// 検査一覧（StudyTable.vue）は今のところ public/dicom/manifest.json を直接パースした
// frontend側だけのデータで動いており、backendのDBとはまだ統合されていない
// （詳しくは frontend/README.md の「DICOMアップロード」の節を参照）。
// 本来はレポート機能と一緒にbackend側で管理すべき状態だが、レポート機能自体が
// このプロジェクトのスコープ外のため、見た目と操作感を再現する目的で
// ブラウザのlocalStorageに保存する簡易実装にしている。

import { reactive, watch } from 'vue'

export type ReadingStatus = 'not-entered' | 'in-progress' | 'draft-saved' | 'finalized'

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  'not-entered': '未記入',
  'in-progress': '記入中',
  'draft-saved': '一時保存',
  finalized: '最終確定',
}

// 選択肢として順番に並べたい場合に使う配列（ドロップダウンの表示順）。
export const READING_STATUS_OPTIONS: ReadingStatus[] = [
  'not-entered',
  'in-progress',
  'draft-saved',
  'finalized',
]

const STORAGE_KEY = 'dicom-tool.readingStatus'

function loadFromStorage(): Record<string, ReadingStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// モジュールスコープの reactive オブジェクト1つを全コンポーネントで共有する
// （Piniaストアを新設するほどではない小さな状態なので、Composableの中に閉じ込めている）。
const statusMap = reactive<Record<string, ReadingStatus>>(loadFromStorage())

watch(
  statusMap,
  (value) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  },
  { deep: true }
)

export function useReadingStatus() {
  function getStatus(studyInstanceUID: string): ReadingStatus {
    return statusMap[studyInstanceUID] ?? 'not-entered'
  }

  function setStatus(studyInstanceUID: string, status: ReadingStatus) {
    statusMap[studyInstanceUID] = status
  }

  return { statusMap, getStatus, setStatus }
}
