// ======================================================
// composables/useCheckableRows.ts — Notion風チェックボックス選択の共通ロジック
// ======================================================
// 指示書2.md 要望4「各レコードに左側にチェックボックス的なものを作ってほしい。notionみたいに」に対応する。
// 「どの行がチェックされているか」だけを持つシンプルなComposable。
// チェックされた行は呼び出し側（StudyTable.vue等）で
//   - 編集可能なセル（<input>）に切り替える
//   - 1件以上チェックされていればツールバーに削除ボタンを表示する
// という2つの用途に使う。検査・シリーズ・SOPの3箇所で共通して使うため、
// useDragSort.ts・useReorderable.ts と同じ理由でここに切り出している。

import { ref } from 'vue'

export function useCheckableRows<T>(getId: (item: T) => string) {
  const checkedIds = ref<Set<string>>(new Set())

  function isChecked(item: T): boolean {
    return checkedIds.value.has(getId(item))
  }

  function toggle(item: T) {
    const id = getId(item)
    const next = new Set(checkedIds.value)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    checkedIds.value = next
  }

  function clear() {
    checkedIds.value = new Set()
  }

  return { checkedIds, isChecked, toggle, clear }
}
