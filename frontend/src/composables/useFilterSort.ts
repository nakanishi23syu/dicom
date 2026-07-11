// ======================================================
// composables/useFilterSort.ts — Notion風のフィルター・ソートの共通ロジック
// ======================================================
// Notionのデータベースビューにある「+ フィルターを追加」のように、
// 複数のフィルター条件（すべて満たすものだけ表示＝AND）を組み立てられる。
//
// ソートは「カラム名（列見出し）をクリックすると昇順→降順→ソート解除の順に切り替わる」
// という、表計算ソフトや多くのテーブルUIで一般的な操作方式にしている
// （以前は「+ 並び替えを追加」で複数条件を積み重ねる方式だったが、
// 「ソートはカラム名をクリックで」という要望に合わせて1カラムだけを対象にする方式へ変更した）。
// ソートが有効な間は表示順がソート結果で決まるため、ドラッグ&ドロップでの手動並べ替えは
// 意味を持たない（Notion本体もソート適用中は手動ドラッグ並べ替えができない）。
// 手動並べ替えは呼び出し側で composables/useDragSort.ts と組み合わせて実装する。
//
// 特定の画面に依存しない汎用ロジックとして、フィールドの値の取り出し方（getFieldValue）だけを
// 呼び出し側から渡してもらう設計にしている（検査一覧以外の一覧にも将来転用できる）。

import { ref, computed, type Ref } from 'vue'

export type FilterOperator =
  | 'contains' // 含む
  | 'notContains' // 含まない
  | 'equals' // と等しい
  | 'isEmpty' // 空である
  | 'isNotEmpty' // 空でない
  | 'onOrAfter' // 以降（日付用）
  | 'onOrBefore' // 以前（日付用）

// 値の入力欄が不要な演算子（「空である」等は値を必要としない）
const OPERATORS_WITHOUT_VALUE: FilterOperator[] = ['isEmpty', 'isNotEmpty']

export function operatorNeedsValue(operator: FilterOperator): boolean {
  return !OPERATORS_WITHOUT_VALUE.includes(operator)
}

export interface FilterRule<TField extends string> {
  id: string
  field: TField
  operator: FilterOperator
  value: string
}

export type SortDirection = 'asc' | 'desc'

export interface SortState<TField extends string> {
  field: TField
  direction: SortDirection
}

let ruleIdCounter = 0
function nextRuleId(): string {
  ruleIdCounter += 1
  return `rule-${ruleIdCounter}`
}

function matchesRule(rawValue: string, rule: { operator: FilterOperator; value: string }): boolean {
  const value = String(rawValue)
  const target = value.toLowerCase()
  const needle = rule.value.toLowerCase()
  switch (rule.operator) {
    case 'contains':
      return target.includes(needle)
    case 'notContains':
      return !target.includes(needle)
    case 'equals':
      return value === rule.value
    case 'isEmpty':
      return value === ''
    case 'isNotEmpty':
      return value !== ''
    case 'onOrAfter':
      return value !== '' && value >= rule.value
    case 'onOrBefore':
      return value !== '' && value <= rule.value
  }
}

export function useFilterSort<T, TField extends string>(
  items: Ref<T[]>,
  getFieldValue: (item: T, field: TField) => string
) {
  const filterRules = ref<FilterRule<TField>[]>([]) as Ref<FilterRule<TField>[]>
  // 現在ソート中のカラム。nullなら「ソートなし」（＝手動並べ替え順が有効）。
  const sort = ref<SortState<TField> | null>(null) as Ref<SortState<TField> | null>

  // フィルターだけを適用した結果（並べ替えは含まない）。
  // 手動ドラッグ並べ替え用の元データとして呼び出し側に公開する。
  const filteredItems = computed<T[]>(() =>
    items.value.filter((item) =>
      filterRules.value.every((rule) => matchesRule(getFieldValue(item, rule.field), rule))
    )
  )

  // フィルター＋（ソート中であれば）ソートまで適用した結果。
  const filteredSortedItems = computed<T[]>(() => {
    if (!sort.value) return filteredItems.value

    const { field, direction } = sort.value
    return [...filteredItems.value].sort((a, b) => {
      // getFieldValue は呼び出し側の実装次第で文字列以外（例: 数値、Dateから変換し忘れた値）を
      // 返してしまう可能性があるため、比較直前にStringで確実に文字列化しておく。
      const av = String(getFieldValue(a, field))
      const bv = String(getFieldValue(b, field))
      const cmp = av.localeCompare(bv, 'ja')
      return direction === 'asc' ? cmp : -cmp
    })
  })

  function addFilterRule(field: TField) {
    filterRules.value = [...filterRules.value, { id: nextRuleId(), field, operator: 'contains', value: '' }]
  }

  function removeFilterRule(id: string) {
    filterRules.value = filterRules.value.filter((r) => r.id !== id)
  }

  function clearFilters() {
    filterRules.value = []
  }

  // ── カラム名クリックでのソート切り替え ──
  // 1回目のクリック: そのカラムで昇順ソート
  // 2回目のクリック（同じカラム）: 降順に切り替え
  // 3回目のクリック（同じカラム）: ソート解除（手動並べ替え順に戻る）
  // 別のカラムをクリックした場合は、そのカラムの昇順から始める。
  function toggleSort(field: TField) {
    if (!sort.value || sort.value.field !== field) {
      sort.value = { field, direction: 'asc' }
    } else if (sort.value.direction === 'asc') {
      sort.value = { field, direction: 'desc' }
    } else {
      sort.value = null
    }
  }

  return {
    filterRules,
    sort,
    filteredItems,
    filteredSortedItems,
    addFilterRule,
    removeFilterRule,
    clearFilters,
    toggleSort,
  }
}
