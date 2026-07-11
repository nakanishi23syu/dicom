// ======================================================
// composables/useFilterSort.ts — Notion風のフィルター・ソートの共通ロジック
// ======================================================
// Notionのデータベースビューにある「+ フィルターを追加」「+ 並び替えを追加」のように、
// 複数のフィルター条件（すべて満たすものだけ表示＝AND）と、
// 複数段階の並び替え（1つ目の項目が同値の場合だけ2つ目の項目で比較）を組み立てられる。
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

export interface SortRule<TField extends string> {
  id: string
  field: TField
  direction: 'asc' | 'desc'
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
  const sortRules = ref<SortRule<TField>[]>([]) as Ref<SortRule<TField>[]>

  const filteredSortedItems = computed<T[]>(() => {
    // ── フィルター（すべての条件を満たす行だけ残す＝AND） ──
    let result = items.value.filter((item) =>
      filterRules.value.every((rule) => matchesRule(getFieldValue(item, rule.field), rule))
    )

    // ── 並び替え（1段階目が同値のときだけ2段階目を見る） ──
    if (sortRules.value.length > 0) {
      result = [...result].sort((a, b) => {
        for (const rule of sortRules.value) {
          // getFieldValue は呼び出し側の実装次第で文字列以外（例: 数値、Dateから変換し忘れた値）を
          // 返してしまう可能性があるため、比較直前にStringで確実に文字列化しておく。
          const av = String(getFieldValue(a, rule.field))
          const bv = String(getFieldValue(b, rule.field))
          const cmp = av.localeCompare(bv, 'ja')
          if (cmp !== 0) {
            return rule.direction === 'asc' ? cmp : -cmp
          }
        }
        return 0
      })
    }

    return result
  })

  function addFilterRule(field: TField) {
    filterRules.value = [...filterRules.value, { id: nextRuleId(), field, operator: 'contains', value: '' }]
  }

  function removeFilterRule(id: string) {
    filterRules.value = filterRules.value.filter((r) => r.id !== id)
  }

  function addSortRule(field: TField) {
    sortRules.value = [...sortRules.value, { id: nextRuleId(), field, direction: 'asc' }]
  }

  function removeSortRule(id: string) {
    sortRules.value = sortRules.value.filter((r) => r.id !== id)
  }

  function clearFilters() {
    filterRules.value = []
  }

  function clearSort() {
    sortRules.value = []
  }

  return {
    filterRules,
    sortRules,
    filteredSortedItems,
    addFilterRule,
    removeFilterRule,
    addSortRule,
    removeSortRule,
    clearFilters,
    clearSort,
  }
}
