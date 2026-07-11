<!--
  ======================================================
  LifecycleWatchUnit.vue — 単元4: ライフサイクルとWatch
  ======================================================
  ここで学ぶこと:
    - onMounted / onUnmounted（マウント時・破棄時に処理を実行する）
    - watch（特定の値の変化を監視して処理を実行する）
    - watchEffect（使った値を自動追跡して即座に実行する）
-->

<template>
  <TutorialUnitShell
    title="単元4: ライフサイクルとWatch"
    subtitle="onMounted / onUnmounted / watch / watchEffect"
  >
    <div class="demo-block">
      <h4>デモ1: 経過時間タイマー（onMounted + onUnmounted）</h4>
      <p class="lead">
        このコンポーネントが画面に表示されてからの経過秒数。 1秒ごとに setInterval
        で加算し、コンポーネントが消えるときに onUnmounted で必ず clearInterval
        している（怠るとメモリリークの原因になる）。
      </p>
      <p class="big-number">{{ elapsedSeconds }} 秒経過</p>
    </div>

    <div class="demo-block">
      <h4>デモ2: 検索キーワードの監視（watch）</h4>
      <input v-model="keyword" placeholder="検索キーワードを入力" class="text-input" />
      <ul class="log-list">
        <li v-for="(log, i) in watchLogs" :key="i">{{ log }}</li>
      </ul>
    </div>

    <div class="demo-block">
      <h4>デモ3: watchEffect（依存関係の自動追跡）</h4>
      <div class="counter-row">
        <button @click="a++">a を増やす ({{ a }})</button>
        <button @click="b++">b を増やす ({{ b }})</button>
      </div>
      <p class="computed-line">watchEffect のログ: {{ sumLog }}</p>
    </div>

    <template #analogy>
      <p>
        <code>onMounted</code>
        は「開店準備」、
        <code>onUnmounted</code>
        は「閉店作業」。 店を開けたら（マウント）タイマーを起動し、
        店を閉めるとき（アンマウント）は必ず後片付け（clearInterval）をする。
        後片付けを忘れると、閉店したはずの店のタイマーが裏で動き続けてしまう （＝メモリリーク）。
      </p>
      <p>
        <code>watch</code>
        は「指定した人だけを見張る監視カメラ」。
        <code>keyword</code>
        という特定の値だけを見ていて、変化した瞬間に反応する。
      </p>
      <p>
        <code>watchEffect</code>
        は「部屋の中で使った道具を自動で覚えてくれるカメラ」。 関数の中で実際に読み取った値（a,
        b）だけを自動的に監視対象にする。 監視対象を「keywordを見て」のように名指しする必要がない。
      </p>
    </template>

    <template #react>
      <p>
        <code>onMounted(fn)</code>
        は
        <code>useEffect(() =&gt; { fn() }, [])</code>
        （空の依存配列）に対応する。
      </p>
      <p>
        <code>onUnmounted(fn)</code>
        は
        <code>useEffect(() =&gt; { return () =&gt; fn() }, [])</code>
        の「クリーンアップ関数（returnで返す関数）」に対応する。
        Vueではマウント用とアンマウント用の関数が最初から分かれている点が違い。
      </p>
      <p>
        <code>watch(keyword, callback)</code>
        は
        <code>useEffect(() =&gt; { callback() }, [keyword])</code>
        に対応する。Reactは依存配列を手で列挙するが、 Vueは監視したい ref を第一引数で明示的に渡す。
      </p>
      <p>
        <code>watchEffect(fn)</code>
        に完全に対応する標準フックはReactにはない。 近いのは依存配列を省略した
        <code>useEffect(() =&gt; { fn() })</code>
        （※依存配列なしは毎レンダリングで実行されるため、意味は異なる）。
        VueのwatchEffectは「実行時に読んだリアクティブな値」だけを対象にする点が
        Reactの仕組みとの大きな違い。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect, onMounted, onUnmounted } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'

// ======================================================
// デモ1: onMounted / onUnmounted
// ======================================================
const elapsedSeconds = ref(0)
let timerId: ReturnType<typeof setInterval> | undefined

// onMounted: このコンポーネントのDOMが実際に画面に描画された直後に呼ばれる。
onMounted(() => {
  timerId = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
})

// onUnmounted: このコンポーネントが画面から取り除かれる直前に呼ばれる。
// setInterval は明示的に止めない限り動き続けるため、
// ここで必ず clearInterval して後片付けする。
onUnmounted(() => {
  clearInterval(timerId)
})

// ======================================================
// デモ2: watch — 特定の値を監視する
// ======================================================
const keyword = ref('')
const watchLogs = ref<string[]>([])

// watch(監視対象, (新しい値, 古い値) => {...})
// keyword.value が変わるたびにコールバックが呼ばれる。
// 第一引数に ref を渡すことで「この値だけを見張る」ことを明示できる。
watch(keyword, (newValue, oldValue) => {
  watchLogs.value.unshift(`"${oldValue}" → "${newValue}" に変化（検索実行を想定）`)
  // ログが増えすぎないように直近5件だけ保持
  watchLogs.value = watchLogs.value.slice(0, 5)
})

// ======================================================
// デモ3: watchEffect — 使った値を自動で追跡する
// ======================================================
const a = ref(0)
const b = ref(0)
const sumLog = ref('')

// watchEffect(fn) は登録した瞬間に1度実行され、
// fn の中で実際に読み取った ref（ここでは a と b の両方）を自動検出し、
// それらが変わるたびに再実行される。
// 「a と b を監視して」と明示しなくても、使った値だけを賢く追跡してくれる。
watchEffect(() => {
  sumLog.value = `a(${a.value}) + b(${b.value}) = ${a.value + b.value}`
})
</script>

<style scoped>
.demo-block + .demo-block {
  margin-top: 1.5rem;
}

.demo-block h4 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: #8b9ab3;
}

.lead {
  font-size: 0.82rem;
  color: #566475;
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.big-number {
  font-size: 1.5rem;
  font-weight: 700;
  color: #7eb8f7;
}

.text-input {
  width: 100%;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #2a3f5f;
  background: #0d1117;
  color: #c8d6e5;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.text-input:focus {
  outline: none;
  border-color: #7eb8f7;
}

.log-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #8b9ab3;
}

.counter-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.counter-row button {
  background: #1e2d45;
  color: #7eb8f7;
  border: 1px solid #2a3f5f;
  border-radius: 5px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  font-size: 0.82rem;
}

.counter-row button:hover {
  background: #243550;
}

.computed-line {
  font-size: 0.85rem;
  color: #8b9ab3;
}
</style>
