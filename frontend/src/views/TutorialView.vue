<!--
  ======================================================
  views/TutorialView.vue — Vue学習チュートリアルページ
  ======================================================
  features/tutorial/components/ にある単元別コンポーネントを
  サイドバーで切り替えながら表示するページ。

  【このViewの役割】
  各単元コンポーネント自体には「どの単元を表示するか」の判断ロジックは持たせず、
  ここ（View）が「単元の一覧管理」と「選択状態の管理」を担当する。
  単元コンポーネントを追加したくなったら、下の units 配列に1行追加するだけでよい。
-->

<template>
  <div class="page">
    <header class="page-header">
      <RouterLink :to="{ name: 'study-list' }" class="back-link">← 検査一覧に戻る</RouterLink>
      <h1>Vue 学習チュートリアル</h1>
      <p class="page-desc">
        単元ごとに、実際に動くサンプルコードと解説コメントでVue 3の基本を学べます。
        React経験者向けの比較解説つき。
      </p>
    </header>

    <div class="page-body">
      <!-- ── サイドバー: 単元一覧（グループごとに見出しを挟む） ── -->
      <nav class="sidebar">
        <template v-for="group in groupedUnits" :key="group.name">
          <p class="group-heading">{{ group.name }}</p>
          <button
            v-for="unit in group.units"
            :key="unit.id"
            class="unit-nav-item"
            :class="{ active: currentUnitId === unit.id }"
            @click="currentUnitId = unit.id"
          >
            <span class="unit-index">{{ unit.number }}</span>
            <span>{{ unit.label }}</span>
          </button>
        </template>
      </nav>

      <!-- ── メイン: 選択中の単元コンポーネントを表示 ───────── -->
      <main class="unit-content">
        <!--
          <component :is="..."> は「表示するコンポーネントを動的に切り替える」組み込みタグ。
          v-if を単元の数だけ並べるより、1箇所に集約できてシンプルになる。
        -->
        <component :is="currentUnit.component" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Component } from 'vue'

import ReactivityUnit from '@/features/tutorial/components/ReactivityUnit.vue'
import DirectivesUnit from '@/features/tutorial/components/DirectivesUnit.vue'
import PropsEmitsUnit from '@/features/tutorial/components/PropsEmitsUnit.vue'
import LifecycleWatchUnit from '@/features/tutorial/components/LifecycleWatchUnit.vue'
import ComposablesUnit from '@/features/tutorial/components/ComposablesUnit.vue'
import SlotsUnit from '@/features/tutorial/components/SlotsUnit.vue'
import PiniaStoreUnit from '@/features/tutorial/components/PiniaStoreUnit.vue'
import RenderingInternalsUnit from '@/features/tutorial/components/RenderingInternalsUnit.vue'
import ReactivityInternalsUnit from '@/features/tutorial/components/ReactivityInternalsUnit.vue'
import SchedulerUpdateTimingUnit from '@/features/tutorial/components/SchedulerUpdateTimingUnit.vue'
import KeyDiffAlgorithmUnit from '@/features/tutorial/components/KeyDiffAlgorithmUnit.vue'
import CustomDirectivesUnit from '@/features/tutorial/components/CustomDirectivesUnit.vue'
import GraphQLUnit from '@/features/tutorial/components/GraphQLUnit.vue'
import CommonComponentsUnit from '@/features/tutorial/components/CommonComponentsUnit.vue'
import DragSortUnit from '@/features/tutorial/components/DragSortUnit.vue'

// ======================================================
// units — 単元の一覧データ
// ======================================================
// id    : サイドバーの選択状態を管理するためのキー
// label : サイドバーに表示する名前
// group : サイドバーの見出し（基礎編 / 応用・内部実装編）
// component : <component :is> に渡す実体（インポートしたコンポーネント）
interface TutorialUnit {
  id: string
  label: string
  group: string
  component: Component
}

const units: TutorialUnit[] = [
  {
    id: 'reactivity',
    label: 'テンプレート構文とリアクティビティ',
    group: '基礎編',
    component: ReactivityUnit,
  },
  { id: 'directives', label: '条件分岐とリスト表示', group: '基礎編', component: DirectivesUnit },
  { id: 'props-emits', label: 'Props & Emits', group: '基礎編', component: PropsEmitsUnit },
  {
    id: 'lifecycle-watch',
    label: 'ライフサイクルとWatch',
    group: '基礎編',
    component: LifecycleWatchUnit,
  },
  {
    id: 'composables',
    label: 'Composable（ロジックの再利用）',
    group: '基礎編',
    component: ComposablesUnit,
  },
  { id: 'slots', label: 'Slots（コンテンツの差し込み）', group: '基礎編', component: SlotsUnit },
  {
    id: 'pinia-store',
    label: 'Pinia Store（グローバル状態）',
    group: '基礎編',
    component: PiniaStoreUnit,
  },
  {
    id: 'rendering-internals',
    label: '仮想DOMとレンダリングの仕組み',
    group: '応用・内部実装編',
    component: RenderingInternalsUnit,
  },
  {
    id: 'reactivity-internals',
    label: 'リアクティビティシステムの内部',
    group: '応用・内部実装編',
    component: ReactivityInternalsUnit,
  },
  {
    id: 'scheduler-update-timing',
    label: '更新タイミングとスケジューラ',
    group: '応用・内部実装編',
    component: SchedulerUpdateTimingUnit,
  },
  {
    id: 'key-diff-algorithm',
    label: 'keyと差分アルゴリズム',
    group: '応用・内部実装編',
    component: KeyDiffAlgorithmUnit,
  },
  {
    id: 'custom-directives',
    label: 'v-memo・カスタムディレクティブ・KeepAlive',
    group: '応用・内部実装編',
    component: CustomDirectivesUnit,
  },
  {
    id: 'graphql',
    label: 'GraphQLバックエンドとの接続',
    group: '応用・内部実装編',
    component: GraphQLUnit,
  },
  {
    id: 'common-components',
    label: '汎用UIコンポーネント',
    group: '応用・内部実装編',
    component: CommonComponentsUnit,
  },
  {
    id: 'drag-sort',
    label: 'Notion風ドラッグ&ドロップ並べ替え',
    group: '応用・内部実装編',
    component: DragSortUnit,
  },
]

// 現在選択中の単元ID。最初は先頭の単元を表示する。
const currentUnitId = ref(units[0].id)

// currentUnitId に対応する単元データを探すcomputed。
// 万が一見つからない場合に備え、先頭の単元をフォールバックにする。
const currentUnit = computed(() => units.find((u) => u.id === currentUnitId.value) ?? units[0])

// ======================================================
// groupedUnits — サイドバー表示用に units を group ごとにまとめたcomputed
// ======================================================
// 通し番号（number）は全体を通じて連番になるようにする
// （「基礎編7つ→応用編1,2...」ではなく「1〜9」と数字が連続する方が進捗感がわかりやすい）。
const groupedUnits = computed(() => {
  const groups: { name: string; units: (TutorialUnit & { number: number })[] }[] = []
  units.forEach((unit, index) => {
    let group = groups.find((g) => g.name === unit.group)
    if (!group) {
      group = { name: unit.group, units: [] }
      groups.push(group)
    }
    group.units.push({ ...unit, number: index + 1 })
  })
  return groups
})
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.back-link {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--color-accent);
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.back-link:hover {
  text-decoration: underline;
}

.page-header h1 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--color-text-heading);
}

.page-desc {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.page-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-border);
  background: var(--color-bg);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  overflow-y: auto;
}

.group-heading {
  padding: 0.6rem 0.75rem 0.2rem;
  font-size: 0.68rem;
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.group-heading:first-child {
  padding-top: 0.1rem;
}

.unit-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  color: var(--color-text-muted);
  font-size: 0.83rem;
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.unit-nav-item:hover {
  background: var(--color-surface-alt);
  color: var(--color-text);
}

.unit-nav-item.active {
  background: var(--color-accent-selected-bg);
  border-color: var(--color-border-strong);
  color: var(--color-accent);
}

.unit-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  background: var(--color-accent-bg);
  color: var(--color-accent);
  font-size: 0.7rem;
  flex-shrink: 0;
}

.unit-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
}
</style>
