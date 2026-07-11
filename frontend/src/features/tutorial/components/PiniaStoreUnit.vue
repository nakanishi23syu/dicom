<!--
  ======================================================
  PiniaStoreUnit.vue — 単元7: Pinia Store（グローバル状態管理）
  ======================================================
  ここで学ぶこと:
    - defineStore で作った Store は「アプリ全体で共有されるシングルトン」
    - Props/Emitsのバケツリレーなしに、離れたコンポーネント同士が状態を共有できる
    - Composable（単元5）との違い: Composableは呼ぶたびに別状態、Storeは常に同じ状態
-->

<template>
  <TutorialUnitShell
    title="単元7: Pinia Store（グローバル状態管理）"
    subtitle="親子関係のない2つのコンポーネントが、同じ状態を共有する"
  >
    <div class="demo-block">
      <p class="lead">
        このコンポーネント（操作側）と
        <code>PiniaStoreCounterDisplay</code>
        （表示側）は Props/Emitsで一切繋がっていない。それでも
        <code>useTutorialCounterStore()</code>
        を通じて同じ count を参照・共有している。
      </p>

      <div class="control-row">
        <button @click="store.increment()">count を増やす</button>
        <button @click="store.reset()">リセット</button>
      </div>
      <p class="computed-line">
        このコンポーネントから見た count:
        <strong>{{ store.count }}</strong>
        （{{ store.isEven ? '偶数' : '奇数' }}）
      </p>

      <PiniaStoreCounterDisplay />
    </div>

    <template #analogy>
      <p>
        Composable（単元5）は「1人1つ配られる道具セット」で、呼ぶたびに新品が渡される。 一方 Store
        は「オフィスに1つだけ置いてある共有のホワイトボード」。
        どの部屋（コンポーネント）からアクセスしても、 見えているのは同じ1枚のホワイトボードの内容。
        誰かが書き込む（increment）と、他の部屋から見ても即座に変わって見える。
      </p>
    </template>

    <template #react>
      <p>
        Pinia の Store は、Reactでいう Redux / Zustand の Store、 または Context API + useContext
        の組み合わせに相当する。
        「コンポーネントツリーの外側にある、複数コンポーネントが参照できる状態」 という役割は共通。
      </p>
      <p>
        Zustandに近い書き味:
        <code>defineStore('id', () =&gt; {'{ state, actions }'})</code>
        は Zustand の
        <code>create((set) =&gt; ({'{ state, actions }'}))</code>
        とよく似ている。Reduxのような
        <code>dispatch(action)</code>
        や reducer の分岐処理は不要で、 Store内の関数（Action）を直接呼ぶだけでよい。
      </p>
      <p>
        Context APIとの違いは、Piniaは
        <code>&lt;Provider&gt;</code>
        で囲む必要がない点。
        <code>useTutorialCounterStore()</code>
        をどこで呼んでも 同じインスタンスが返る（Pinia自体がアプリ全体にひとつ登録されているため）。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import TutorialUnitShell from './TutorialUnitShell.vue'
import PiniaStoreCounterDisplay from './PiniaStoreCounterDisplay.vue'
import { useTutorialCounterStore } from '../stores/tutorialCounterStore'

// この呼び出しと PiniaStoreCounterDisplay.vue 内の呼び出しは、
// 見た目は別々でも「同じ1つのStoreインスタンス」を参照している。
const store = useTutorialCounterStore()
</script>

<style scoped>
.lead {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.control-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.control-row button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
}

.control-row button:hover {
  background: var(--color-accent-bg-hover);
}

.computed-line {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
}
</style>
