// ======================================================
// composables/useEditableList.ts — 並べ替え + インライン編集の統合保存（共通ロジック）
// ======================================================
// 以前は「並べ替え」（composables/useReorderable.ts）と「インライン編集」
// （各コンポーネントごとにbackend呼び出しをベタ書き）が別々の仕組みで、
// 保存ボタンも2つに分かれていた。
// これを「元データ（items）を最初にスナップショットし、ドラッグ並べ替え・
// v-modelでのセル編集はローカルの作業用配列（workingItems）だけを書き換え、
// 1つの保存ボタンでスナップショットとの差分だけをbackendへ送る」方式に統一する。
// 検査・シリーズ・SOPの3箇所で同じ形の処理が必要なため、ここに共通化する
// （実際のドラッグ操作は composables/useDragSort.ts が担当する）。

import { ref, watch, type Ref } from 'vue'

export interface EditableListOptions<T> {
  getId: (item: T) => string
  getOrder: (item: T) => number
  // 差分検出・送信ペイロード構築の両方に使う「編集対象フィールドの現在値」。
  // 呼び出し側が「どのフィールドを保存対象にするか」を決める（キー名がそのままMutationの引数名になる）。
  getFields: (item: T) => Record<string, string>
}

interface Snapshot {
  order: number
  fields: Record<string, string>
}

// 1つの変更行（並べ替え・フィールド編集のどちらか、または両方）。
export interface ItemPatch {
  order?: number
  fields?: Record<string, string>
}

export function useEditableList<T>(items: Ref<T[]>, options: EditableListOptions<T>) {
  const { getId, getOrder, getFields } = options

  // ドラッグ並べ替え・セル編集の両方を反映する作業用配列（実体はこの配列の要素を直接書き換える）。
  const workingItems = ref<T[]>([]) as Ref<T[]>
  let snapshot = new Map<string, Snapshot>()

  const dirty = ref(false)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  // apply()自身によるworkingItemsへの代入を、下のwatchがdirty化と誤認しないようにするフラグ。
  let suppressDirty = false

  function takeSnapshot(list: T[]): Map<string, Snapshot> {
    const map = new Map<string, Snapshot>()
    list.forEach((item, index) => {
      map.set(getId(item), { order: index, fields: getFields(item) })
    })
    return map
  }

  // items（元データ）をDBのorder昇順に並べ替えて作業用配列にセットし直し、
  // その状態を新しいスナップショット（＝以後の差分検出の基準）として確定する。
  // 「適用（元に戻す）」ボタンの処理そのものであり、初期表示時にも自動で1回実行される。
  function apply() {
    suppressDirty = true
    workingItems.value = [...items.value].sort((a, b) => getOrder(a) - getOrder(b))
    snapshot = takeSnapshot(workingItems.value)
    dirty.value = false
  }

  // items（backendからの再取得結果等）が変わるたびに、まだ編集していないなら追随する。
  // 既に編集中の変更がある場合は、再取得のたびに上書きされると操作感を損なうため上書きしない。
  watch(
    items,
    () => {
      if (!dirty.value) apply()
    },
    { immediate: true }
  )

  // ドラッグ並べ替え（配列の入れ替え）・v-modelでのセル編集（プロパティ変更）の両方を
  // 1つのdirty判定で拾うため、配列参照だけでなくプロパティの変更もdeepで監視する
  // （一覧の規模が小さい学習用プロジェクトのため、deep watchのコストは許容範囲）。
  watch(
    workingItems,
    () => {
      if (suppressDirty) {
        suppressDirty = false
        return
      }
      dirty.value = true
    },
    { deep: true }
  )

  // 現在のworkingItemsをスナップショットと突き合わせ、実際に変更された行だけを抽出する。
  // toChange: 1行分の差分（並べ替え後のindex・変更されたフィールドの値）を、
  // 呼び出し側が期待するMutation入力の形（例: StudyChangeInput）に変換するコールバック。
  function collectChanges<C>(toChange: (item: T, patch: ItemPatch) => C): C[] {
    const changes: C[] = []
    workingItems.value.forEach((item, index) => {
      const snap = snapshot.get(getId(item))
      const currentFields = getFields(item)
      const orderChanged = !snap || snap.order !== index

      const changedFields: Record<string, string> = {}
      for (const key of Object.keys(currentFields)) {
        if (!snap || currentFields[key] !== snap.fields[key]) {
          changedFields[key] = currentFields[key]
        }
      }
      const hasFieldChanges = Object.keys(changedFields).length > 0

      if (orderChanged || hasFieldChanges) {
        changes.push(
          toChange(item, {
            order: orderChanged ? index : undefined,
            fields: hasFieldChanges ? changedFields : undefined,
          })
        )
      }
    })
    return changes
  }

  // 差分だけをmutationFnに渡して保存する。変更が無ければ何もしない。
  async function save<C>(
    toChange: (item: T, patch: ItemPatch) => C,
    mutationFn: (changes: C[]) => Promise<number>
  ): Promise<number> {
    const changes = collectChanges(toChange)
    if (changes.length === 0) return 0

    saving.value = true
    saveError.value = null
    try {
      const count = await mutationFn(changes)
      // 保存できた状態を新しい基準にする（続けて編集した場合、次の保存でまた差分だけ送れるように）。
      snapshot = takeSnapshot(workingItems.value)
      dirty.value = false
      return count
    } catch (e) {
      saveError.value = e instanceof Error ? e.message : '保存に失敗しました'
      throw e
    } finally {
      saving.value = false
    }
  }

  return { workingItems, dirty, saving, saveError, apply, save }
}
