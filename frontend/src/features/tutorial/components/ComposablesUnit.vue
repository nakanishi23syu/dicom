<!--
  ======================================================
  ComposablesUnit.vue — 単元5: Composable（ロジックの再利用）
  ======================================================
  ここで学ぶこと:
    - use から始まる関数（Composable）にロジックを切り出す
    - 同じComposableを複数箇所で呼んでも状態は独立している
    - コンポーネント間でロジック（状態＋振る舞い）を再利用する方法
-->

<template>
  <TutorialUnitShell
    title="単元5: Composable（ロジックの再利用）"
    subtitle="useMouseTracker を2箇所で使い、状態が独立していることを確認する"
  >
    <div class="demo-block">
      <p class="lead">
        下の2つの箱は、同じ
        <code>useMouseTracker()</code>
        というComposableを それぞれ独立して呼び出している。マウスを乗せて動かすと、
        箱ごとに別々の座標が表示されることを確認できる （=
        同じロジックを呼んでも状態は共有されず、毎回新しく作られる）。
      </p>

      <div class="tracker-row">
        <div ref="boxA" class="tracker-box">
          <p>箱A</p>
          <p class="coords">x: {{ trackerA.x.value }} / y: {{ trackerA.y.value }}</p>
        </div>
        <div ref="boxB" class="tracker-box">
          <p>箱B</p>
          <p class="coords">x: {{ trackerB.x.value }} / y: {{ trackerB.y.value }}</p>
        </div>
      </div>
    </div>

    <template #analogy>
      <p>
        Composable は「持ち運びできる作業道具セット」。
        <code>useMouseTracker()</code>
        という道具セットを2人（箱A・箱B）に それぞれ配ると、2人は同じ種類の道具を持つが、
        中に入っている実際のデータ（座標）は別物として扱われる。
        道具セットの「設計図」は1つでも、配られた実体は配った数だけ存在する。
      </p>
    </template>

    <template #react>
      <p>
        VueのComposableはReactの「カスタムフック」に相当する。
        <code>useMouseTracker()</code>
        は Reactで書けば
        <code>function useMouseTracker() { ... return { x, y } }</code>
        とほぼ同じ形になる。
      </p>
      <p>
        大きな違いは「呼び出しルール」。Reactのフックは
        「コンポーネントのトップレベルで、条件分岐やループの中では呼ばない」という
        厳格なルール（Rules of Hooks）があり、ESLintプラグインで強制されるのが一般的。
        これはReactが「呼ばれた順番」でどのstateがどのuseStateに対応するかを
        管理しているために生まれる制約。
      </p>
      <p>
        Vueの
        <code>ref()</code>
        は変数に束縛された独立したオブジェクトなので、
        呼び出し順にVue自身が依存する仕組みにはなっていない。
        とはいえ、可読性やコードの一貫性のため、 Composableも慣習として
        <code>&lt;script setup&gt;</code>
        の トップレベルで呼ぶのが一般的。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import { useMouseTracker } from '../composables/useMouseTracker'

// テンプレート内の ref="boxA" と紐付く、DOM要素への参照
const boxA = ref<HTMLElement | null>(null)
const boxB = ref<HTMLElement | null>(null)

// ======================================================
// 同じ Composable を2回呼び出す
// ======================================================
// useMouseTracker() は呼ばれるたびに新しい x, y の ref ペアを作って返す関数。
// trackerA と trackerB は見た目は同じでも、内部的には完全に別物の ref を持つ。
// ※ boxA.value はこの時点（setup実行時）ではまだ null
//   （テンプレート参照はマウント後に埋まる）。
//   そのため boxA.value ではなく boxA（Ref自体）を渡し、
//   Composable側の onMounted で読ませることで正しく紐付ける。
const trackerA = useMouseTracker(boxA)
const trackerB = useMouseTracker(boxB)
</script>

<style scoped>
.lead {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.tracker-row {
  display: flex;
  gap: 1rem;
}

.tracker-box {
  flex: 1;
  background: var(--color-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: 6px;
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text);
}

.tracker-box p {
  margin: 0.25rem 0;
}

.coords {
  font-size: 0.85rem;
  color: var(--color-accent);
  font-variant-numeric: tabular-nums;
}
</style>
