// ======================================================
// composables/useReorderable.ts — ドラッグ&ドロップ並べ替えのDB保存・適用（共通ロジック）
// ======================================================
// 以前の useManualOrder.ts はブラウザのlocalStorageに並び順を保存していたが、
// 指示書2.mdの要望（並べ替えをDBのorderカラムに保存・適用し、サイトアクセス時にも
// DBの並び順を反映する）に対応するため、backendのOrderカラム＋reorder系Mutationを
// 使う方式に置き換えた。検査・シリーズ・SOPの3箇所で同じ形の処理が必要なため、
// ここに共通化する（実際のドラッグ操作そのものは composables/useDragSort.ts が担当する）。
//
// 使い方の基本方針:
//   - 初期表示・「適用」ボタン: DBのorderフィールド昇順に並べ替えた作業用配列を表示する
//   - ドラッグ操作: 作業用配列だけを書き換える（この時点ではDBに反映されない。dirty=trueになる）
//   - 「保存」ボタン: 作業用配列の並び順をUIDの配列としてbackendのreorder系Mutationに渡す

import { ref, watch, type Ref } from 'vue'

export function useReorderable<T>(
  items: Ref<T[]>,
  getId: (item: T) => string,
  getOrder: (item: T) => number
) {
  // ドラッグで並べ替え可能な作業用配列（useDragSortに渡して直接書き換えてもらう実体）。
  const workingItems = ref<T[]>([]) as Ref<T[]>

  // 直近の「適用」以降にドラッグで変更が加えられたかどうか（保存ボタンの活性判定等に使える）。
  const dirty = ref(false)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  // apply()自身によるworkingItemsへの代入を、下のwatch(workingItems)がdirty化と
  // 誤認しないようにするための1回限りのフラグ。
  let suppressDirty = false

  // items（元データ）をDBのorder昇順に並べ替えて作業用配列にセットし直す。
  // 「適用」ボタンの処理そのものであり、初期表示時にも自動で1回実行することで
  // 「サイトアクセス時はDBのorder順」も同じ関数で満たす。
  function apply() {
    suppressDirty = true
    workingItems.value = [...items.value].sort((a, b) => getOrder(a) - getOrder(b))
    dirty.value = false
  }

  // items（backendからの再取得結果等）が変わるたびに、まだドラッグで変更していないなら追随する。
  // 既にドラッグ中の変更がある場合は、再取得のたびに上書きされると操作感を損なうため上書きしない。
  watch(
    items,
    () => {
      if (!dirty.value) apply()
    },
    { immediate: true }
  )

  // useDragSortがworkingItems.valueを直接書き換えた（＝ドラッグで並べ替えた）ことを検知してdirty化する。
  // apply()による代入だけはsuppressDirtyで除外する。
  watch(workingItems, () => {
    if (suppressDirty) {
      suppressDirty = false
      return
    }
    dirty.value = true
  })

  // 作業用配列のUID順をbackendのreorder系Mutationに渡して保存する。
  async function save(mutationFn: (orderedIds: string[]) => Promise<number>) {
    saving.value = true
    saveError.value = null
    try {
      await mutationFn(workingItems.value.map(getId))
      dirty.value = false
    } catch (e) {
      saveError.value = e instanceof Error ? e.message : '並べ替えの保存に失敗しました'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { workingItems, dirty, saving, saveError, apply, save }
}
