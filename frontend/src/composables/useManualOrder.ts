// ======================================================
// composables/useManualOrder.ts — ドラッグ&ドロップで決めた手動並び順の保持
// ======================================================
// Notionのテーブルビューは、列ソートを何も適用していない状態だと「最後にドラッグで
// 並べ替えた順番」がそのまま表示順になる。この「手動並び順」を再現するためのComposable。
//
// 実際の並べ替え操作そのものは composables/useDragSort.ts が担当し、
// このComposableは「並べ替えた結果のID順をどこに覚えておくか（localStorage）」
// と「新しく増えた行をどこに差し込むか（末尾）」だけを担当する。
//
// useReadingStatus.ts と同じ理由で、backendではなくlocalStorageに保存している
// （検査一覧はまだbackendのDBと統合されていないため。frontend/README.md参照）。

import { ref, watch } from 'vue'

const STORAGE_KEY_PREFIX = 'dicom-tool.manualOrder.'

function loadOrder(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// storageKeyごとに独立した順序を保持できるようにする（検査一覧・シリーズ一覧等、
// 複数の一覧で同じComposableを使い回せるようにするため）。
export function useManualOrder(storageKey: string) {
  const fullKey = STORAGE_KEY_PREFIX + storageKey
  const orderedIds = ref<string[]>(loadOrder(fullKey))

  watch(
    orderedIds,
    (value) => {
      localStorage.setItem(fullKey, JSON.stringify(value))
    },
    { deep: true }
  )

  // items を「保存済みの手動順」に並べ替える。
  // まだ順序が記録されていない項目（新規追加分）は、元の配列順のまま末尾に置く。
  function applyManualOrder<T>(items: T[], getId: (item: T) => string): T[] {
    const indexOf = new Map(orderedIds.value.map((id, i) => [id, i]))
    return [...items].sort((a, b) => {
      const ai = indexOf.get(getId(a))
      const bi = indexOf.get(getId(b))
      if (ai === undefined && bi === undefined) return 0 // 両方未記録: 元の順序を維持
      if (ai === undefined) return 1 // 未記録の項目は既知の項目より後ろに置く
      if (bi === undefined) return -1
      return ai - bi
    })
  }

  // ドラッグ&ドロップの結果を新しい手動順として保存する。
  // items はフィルター適用後の「今見えている行」だけなので、そのままの配列で上書きすると
  // フィルターで一時的に隠れている項目の順序情報が消えてしまう。
  // そのため「見えている項目を新しい順で先頭に、隠れている項目は元の相対順のまま後ろに残す」
  // マージ方式にしている。
  function setOrder<T>(items: T[], getId: (item: T) => string) {
    const newIds = items.map(getId)
    const newIdSet = new Set(newIds)
    const remaining = orderedIds.value.filter((id) => !newIdSet.has(id))
    orderedIds.value = [...newIds, ...remaining]
  }

  return { orderedIds, applyManualOrder, setOrder }
}
