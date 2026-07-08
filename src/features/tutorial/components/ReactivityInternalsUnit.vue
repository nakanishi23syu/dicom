<!--
  ======================================================
  ReactivityInternalsUnit.vue — 単元9: リアクティビティシステムの内部
  ======================================================
  ここで学ぶこと:
    - Proxyによる track（依存追跡）/ trigger（再実行）の仕組み
    - computedが「関係ない値」の変化では再計算されないこと（ファイングレインな追跡）
    - 分割代入でリアクティビティが失われる罠と、toRefs() による回避
    - refをreactiveオブジェクトに入れると自動アンラップされる仕組み
-->

<template>
  <TutorialUnitShell
    title="単元9: リアクティビティシステムの内部"
    subtitle="Proxyのtrack/triggerと、ハマりがちな罠"
  >
    <!-- ── デモ1: ファイングレインな依存追跡 ──────────────── -->
    <div class="demo-block">
      <h4>デモ1: computedは「実際に使った値」しか追跡しない</h4>
      <p class="lead">
        <code>fullName</code>
        は姓・名の両方を使う computed、
        <code>firstNameUpper</code>
        は名前だけを使う computed。 「姓だけ変える」ボタンを押しても、firstNameUpper
        の再計算回数は増えない （＝関係ない値の変化では再実行されない）。
      </p>

      <div class="control-row">
        <button @click="person.lastName = person.lastName === '山田' ? '鈴木' : '山田'">
          姓を変える（{{ person.lastName }}）
        </button>
        <button @click="person.firstName = person.firstName === '太郎' ? '次郎' : '太郎'">
          名を変える（{{ person.firstName }}）
        </button>
      </div>

      <table class="compute-table">
        <thead>
          <tr>
            <th>computed</th>
            <th>使っている値</th>
            <th>現在の値</th>
            <th>再計算された回数</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>fullName</td>
            <td>lastName + firstName</td>
            <td>{{ fullName }}</td>
            <td class="count-cell">{{ fullNameComputeCount }}</td>
          </tr>
          <tr>
            <td>firstNameUpper</td>
            <td>firstName のみ</td>
            <td>{{ firstNameUpper }}</td>
            <td class="count-cell">{{ firstNameUpperComputeCount }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── デモ2: 分割代入によるリアクティビティ喪失 ──────── -->
    <div class="demo-block">
      <h4>デモ2: 分割代入するとリアクティビティが切れる罠</h4>
      <p class="lead">
        <code>const { count } = state</code>
        のように分割代入すると、
        <code>count</code>
        は「取り出した瞬間の値のコピー」になり、 以後
        <code>state.count</code>
        が変わっても連動しない。
        <code>toRefs(state)</code>
        を使うと、参照（ref）として正しく取り出せる。
      </p>

      <button class="increment-btn" @click="counterState.count++">
        counterState.count++ （元の値: {{ counterState.count }}）
      </button>

      <div class="broken-fixed-row">
        <div class="result-box broken">
          <p class="result-label">✗ 分割代入した count（壊れている）</p>
          <p class="result-value">{{ brokenCount }}</p>
          <p class="result-note">最初に取り出した瞬間の値のまま固まっている</p>
        </div>
        <div class="result-box fixed">
          <p class="result-label">✓ toRefs() で取り出した countRef</p>
          <p class="result-value">{{ fixedCountRef }}</p>
          <p class="result-note">元の state と連動して正しく更新される</p>
        </div>
      </div>
    </div>

    <!-- ── デモ3: reactive内でのref自動アンラップ ─────────── -->
    <div class="demo-block">
      <h4>デモ3: reactiveオブジェクトに入れたrefは自動アンラップされる</h4>
      <p class="lead">
        <code>reactive({ inner: someRef })</code>
        のように ref を reactive オブジェクトのプロパティに入れると、
        <code>wrapper.inner</code>
        と書くだけで
        <code>.value</code>
        なしに 中身の値へアクセスできる（テンプレートでのref自動アンラップと同じ仕組み）。
      </p>
      <button class="increment-btn" @click="innerRef++">innerRef.value++</button>
      <p class="computed-line">
        wrapper.inner（.valueなしでアクセス）:
        <strong>{{ wrapper.inner }}</strong>
      </p>
    </div>

    <template #analogy>
      <p>
        Proxyのtrack/triggerは「専属の秘書」に例えるとわかりやすい。
        computedが値を読むたびに、秘書（Proxyのgetトラップ）が
        「このcomputedはこのプロパティに興味がある」と出席簿に記録する（track）。
        プロパティが書き換わると（setトラップ）、秘書は出席簿を見て
        「このプロパティに興味がある人たちだけ」に再実行を知らせる（trigger）。
        興味を持っていない人（firstNameUpperのように別プロパティしか読んでいない人）には
        知らせが届かない。
      </p>
      <p>
        分割代入の罠は「センサー付きの箱から中身だけを取り出す」ようなもの。
        <code>const { count } = state</code>
        は、センサー付きの箱（reactive）から
        中の数値だけを取り出してコピーする操作。コピーされた数値それ自体には
        センサーが付いていないので、箱の中身がその後変わっても コピーされた側は何も気づかない。
      </p>
    </template>

    <template #react>
      <p>
        Reactには「実際に読んだプロパティだけを自動追跡する」仕組みがない。
        <code>useMemo(() =&gt; fullName, [person.lastName, person.firstName])</code>
        のように、依存する値を配列で自分の手で列挙する必要がある。
        書き忘れると「更新されるべきなのに更新されない」バグになるため、
        <code>eslint-plugin-react-hooks</code>
        の
        <code>exhaustive-deps</code>
        ルールで書き忘れを検出するのが定石になっている。
      </p>
      <p>
        分割代入によるリアクティビティ喪失に完全に対応する概念はReactにはないが、
        近い問題として「stale closure（古い値を掴んだままのクロージャ）」がある。
        イベントハンドラの中で以前のレンダー時の
        <code>count</code>
        を掴んだまま 古い値を使い続けてしまう不具合で、根本原因は違えど
        「今の値だと思っていたら実は古いコピーだった」という体感は似ている。
      </p>
      <p>
        ref自動アンラップに対応する概念もReactにはない。 Reactの
        <code>useRef()</code>
        は常に
        <code>ref.current</code>
        と 書く必要があり、Vueのように文脈に応じて自動で剥がれることはない。
        Vueがこの自動アンラップを提供するのは利便性のためだが、
        裏を返せば「今このプロパティは自動アンラップされる値なのか、
        されない値なのか」を意識する必要がある、というトレードオフでもある。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { reactive, computed, ref, toRefs, watch } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'

// ======================================================
// デモ1: ファイングレインな依存追跡
// ======================================================
const person = reactive({ firstName: '太郎', lastName: '山田' })

const fullName = computed(() => `${person.lastName} ${person.firstName}`)
const firstNameUpper = computed(() => person.firstName.toUpperCase())

// computedの中で直接カウントすると「computedは副作用を持たない純粋な関数であるべき」
// という原則に反してしまう（ESLintのvue/no-side-effects-in-computed-propertiesにも引っかかる）。
// そのため、それぞれのcomputedを watch して「値が実際に変わった回数」を数えることで、
// 副作用を持ち込まずに再計算タイミングの違いを可視化する。
const fullNameComputeCount = ref(0)
watch(fullName, () => {
  fullNameComputeCount.value++
})

const firstNameUpperComputeCount = ref(0)
watch(firstNameUpper, () => {
  firstNameUpperComputeCount.value++
})

// ======================================================
// デモ2: 分割代入によるリアクティビティ喪失
// ======================================================
const counterState = reactive({ count: 0 })

// ✗ 分割代入すると「その時点の値のコピー」が代入されるだけで、
//   以後 counterState.count が変わっても brokenCount には反映されない。
const { count: brokenCount } = counterState

// ✓ toRefs() は reactiveオブジェクトの各プロパティを「refとして」取り出す。
//   ref なので元のオブジェクトと参照でつながったまま生き続ける。
const { count: fixedCountRef } = toRefs(counterState)

// ======================================================
// デモ3: reactive内でのref自動アンラップ
// ======================================================
const innerRef = ref(10)
// reactive() のプロパティに ref をそのまま渡すと、
// wrapper.inner でアクセスしたときに自動で .value 相当の値が返る。
const wrapper = reactive({ inner: innerRef })
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
  line-height: 1.7;
}

.control-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.control-row button,
.increment-btn {
  background: #1e2d45;
  color: #7eb8f7;
  border: 1px solid #2a3f5f;
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
}

.control-row button:hover,
.increment-btn:hover {
  background: #243550;
}

.increment-btn {
  margin-bottom: 0.75rem;
}

.compute-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.compute-table th,
.compute-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #1e2535;
}

.compute-table th {
  color: #8b9ab3;
  font-size: 0.72rem;
  text-transform: uppercase;
}

.count-cell {
  color: #7eb8f7;
  font-weight: 700;
}

.broken-fixed-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.result-box {
  border-radius: 6px;
  padding: 0.75rem;
  border: 1px solid;
}

.result-box.broken {
  background: #2a1a1a;
  border-color: #5c2a2a;
}

.result-box.fixed {
  background: #16281c;
  border-color: #2a5c3a;
}

.result-label {
  font-size: 0.75rem;
  margin-bottom: 0.35rem;
}

.result-box.broken .result-label {
  color: #f87171;
}

.result-box.fixed .result-label {
  color: #4ade80;
}

.result-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e2e8f0;
}

.result-note {
  font-size: 0.7rem;
  color: #8b9ab3;
  margin-top: 0.25rem;
}

.computed-line {
  font-size: 0.85rem;
  color: #8b9ab3;
}
</style>
