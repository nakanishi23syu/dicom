<!--
  ======================================================
  SchedulerUpdateTimingUnit.vue — 単元10: 更新タイミングとスケジューラ
  ======================================================
  ここで学ぶこと:
    - 複数回の同期的な変更は1回のDOM更新にまとめられる（バッチ処理）
    - nextTick() で「DOM更新が終わった後」のタイミングを取得する
    - watch の flush オプション（pre / post / sync）による実行タイミングの違い
-->

<template>
  <TutorialUnitShell
    title="単元10: 更新タイミングとスケジューラ"
    subtitle="なぜ複数回書き換えても再描画は1回で済むのか"
  >
    <!-- ── デモ1: 更新のバッチ処理 ────────────────────────── -->
    <div class="demo-block">
      <h4>デモ1: 同期的な複数回の変更は1回のDOM更新にまとまる</h4>
      <p class="lead">
        「3回連続で増やす」ボタンは
        <code>count.value++</code>
        を3回連続で呼ぶが、 実際にDOM更新が走る回数（
        <code>flush: 'post'</code>
        のwatchが発火する回数）は1回だけ。
        Vueは同じ「tick」の中で起きた複数の変更をまとめて、最後に1回だけ描画する。
      </p>
      <div class="control-row">
        <button @click="count++">+1 だけ増やす</button>
        <button @click="bumpThreeTimes">3回連続で増やす</button>
      </div>
      <p class="computed-line">
        count の値:
        <strong>{{ count }}</strong>
        ／ DOM更新が走った回数:
        <strong>{{ domUpdateCount }}</strong>
      </p>
      <p class="side-note">
        豆知識: 最初はこのカウントを
        <code>onUpdated</code>
        で数えようとしたが、実は発火しなかった。
        <code>count</code>
        を表示している
        <code>&lt;p&gt;</code>
        は
        <code>TutorialUnitShell</code>
        の
        <code>&lt;slot /&gt;</code>
        に渡した内容の中にあり、Vueのスロットは 「親が定義し、子が実行する関数」として扱われるため、
        依存の追跡先は実際に関数を呼び出す
        <strong>子（TutorialUnitShell）側</strong>
        になる。 つまり count が変わって実際に更新されるのはTutorialUnitShellであり、
        このコンポーネント自身の
        <code>onUpdated</code>
        は呼ばれない。 これもレンダリングの仕組みにまつわる細かい仕様のひとつ。
      </p>
    </div>

    <!-- ── デモ2: nextTick ────────────────────────────────── -->
    <div class="demo-block">
      <h4>デモ2: nextTick() で「更新後のDOM」を読む</h4>
      <p class="lead">
        <code>message.value</code>
        を書き換えた直後にDOMを読んでも、
        まだ古い表示のまま（DOM更新は次のtickでまとめて行われるため）。
        <code>await nextTick()</code>
        の後に読むと、更新済みのDOMが取得できる。
      </p>
      <p class="target-line">
        表示中の値:
        <span ref="msgEl">{{ message }}</span>
      </p>
      <button @click="updateAndCheck">値を更新してDOMを読んでみる</button>
      <table class="tick-table">
        <tbody>
          <tr>
            <td>変更直後（nextTickの前）に読んだDOM</td>
            <td class="tick-value">"{{ beforeNextTick }}"</td>
          </tr>
          <tr>
            <td>await nextTick() の後に読んだDOM</td>
            <td class="tick-value">"{{ afterNextTick }}"</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── デモ3: watchのflushタイミング ──────────────────── -->
    <div class="demo-block">
      <h4>デモ3: watch の flush オプション（pre / post / sync）</h4>
      <p class="lead">
        同じ
        <code>counter</code>
        を3種類の flush で監視している。 「3回連続で増やす」を押すと、
        <code>sync</code>
        は変更のたびに即座に3回発火するが、
        <code>pre</code>
        （デフォルト）と
        <code>post</code>
        は1回にまとめられる。 さらに
        <code>pre</code>
        は「DOM更新前」、
        <code>post</code>
        は「DOM更新後」に 発火するため、同じタイミングで読んだDOMの中身が異なる。
      </p>
      <p class="target-line">
        表示中の値:
        <span ref="counterEl">{{ counter }}</span>
      </p>
      <button @click="bumpCounterThreeTimes">3回連続でcounterを増やす</button>

      <table class="flush-table">
        <thead>
          <tr>
            <th>flush</th>
            <th>発火回数</th>
            <th>発火時に見えていたDOMの値</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sync</code></td>
            <td class="count-cell">{{ syncFireCount }}</td>
            <td>（発火のたびに違う値になるため省略。回数の違いに注目）</td>
          </tr>
          <tr>
            <td>
              <code>pre</code>
              （デフォルト）
            </td>
            <td class="count-cell">{{ preFireCount }}</td>
            <td>"{{ preDomSnapshot }}"</td>
          </tr>
          <tr>
            <td><code>post</code></td>
            <td class="count-cell">{{ postFireCount }}</td>
            <td>"{{ postDomSnapshot }}"</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #analogy>
      <p>
        更新のバッチ処理は「宅配便のまとめ配達」に例えるとわかりやすい。
        同じ日に3つ荷物を注文しても（3回の変更）、配達員は3回来るのではなく
        1回でまとめて届けてくれる（1回のDOM更新）。
      </p>
      <p>
        <code>flush: 'pre'</code>
        と
        <code>flush: 'post'</code>
        の違いは「模様替えの前に呼ぶ業者」と「模様替えの後に呼ぶ業者」の違い。
        preの業者は部屋（DOM）がまだ模様替え前の状態のときに来て、
        postの業者は模様替えが終わった後の部屋を見に来る。
        <code>flush: 'sync'</code>
        は「注文するたびに即座に届ける」配達で、
        まとめ配達の恩恵を受けない代わりに一切の遅れがない。
      </p>
    </template>

    <template #react>
      <p>
        React 18以降は、Promiseやタイマー・ネイティブイベントの中も含めて
        「自動バッチング」が標準になり、Vueの既定の挙動とかなり近づいた （React
        17以前は、Reactのイベントハンドラの外側ではバッチングされなかった）。
      </p>
      <p>
        Vueの
        <code>nextTick()</code>
        に近いのは、Reactでは
        <code>useEffect(() =&gt; { ... })</code>
        （DOM更新後に実行される）。
        ただし発想は少し異なり、Reactは「副作用（Effect）」として登録する形、
        Vueは「今すぐこの1回だけ次の更新後に実行して」と都度呼び出す形。
      </p>
      <p>
        <code>flush: 'post'</code>
        のwatcherに近いのは
        <code>useEffect</code>
        、
        <code>flush: 'sync'</code>
        や 「更新前にDOMを読みたい」ケースに近いのは
        <code>useLayoutEffect</code>
        （ブラウザが画面を再描画する前に、DOM更新直後に同期的に実行される）。
        Reactで強制的に同期更新したい場合の
        <code>flushSync()</code>
        は、Vueの
        <code>flush: 'sync'</code>
        watcherと発想が近い（バッチ処理をあえてスキップする、という点で）。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'

// ======================================================
// デモ1: 更新のバッチ処理
// ======================================================
const count = ref(0)
const domUpdateCount = ref(0)

// 【なぜ onUpdated ではなく watch(..., { flush: 'post' }) を使うのか】
// 最初は onUpdated() で数えようとしたが、count を表示している
// <p>{{ count }}</p> は TutorialUnitShell の <slot /> に渡した内容の中にある。
// Vueのスロットは「親が定義し、子が実行する関数」として扱われるため、
// スロットの中で読んだリアクティブな値の依存追跡は
// 実際にスロット関数を呼び出す側（＝子であるTutorialUnitShell）の
// 描画エフェクトに記録される。そのため count が変わっても
// 更新されるのはTutorialUnitShell側であり、
// このコンポーネント自身の onUpdated は呼ばれない
// （これ自体、スロットのレンダリングスコープにまつわる細かい仕様の実例）。
// watch は特定のコンポーネントの描画エフェクトに紐づかず、
// count というリアクティブな値そのものを直接監視するため、
// この問題を回避しつつ「DOM更新（postタイミング）が何回起きたか」を数えられる。
watch(
  count,
  () => {
    domUpdateCount.value++
  },
  { flush: 'post' }
)

function bumpThreeTimes() {
  count.value++
  count.value++
  count.value++
}

// ======================================================
// デモ2: nextTick
// ======================================================
const message = ref('初期値')
const msgEl = ref<HTMLElement | null>(null)
const beforeNextTick = ref('（まだ実行していません）')
const afterNextTick = ref('（まだ実行していません）')

async function updateAndCheck() {
  message.value = '更新後の値'

  // ここではまだDOMは古いまま（Vueは変更をまとめてから描画するため）。
  beforeNextTick.value = msgEl.value?.textContent ?? ''

  // nextTick() は「直近のDOM更新が終わった直後」に解決されるPromiseを返す。
  await nextTick()

  // ここでは既にDOMが書き換わっている。
  afterNextTick.value = msgEl.value?.textContent ?? ''
}

// ======================================================
// デモ3: watchのflushタイミング
// ======================================================
const counter = ref(0)
const counterEl = ref<HTMLElement | null>(null)

const syncFireCount = ref(0)
const preFireCount = ref(0)
const postFireCount = ref(0)
const preDomSnapshot = ref('')
const postDomSnapshot = ref('')

// flush: 'sync' — 変更を検知した瞬間、バッチ処理を待たず即座に実行される。
watch(
  counter,
  () => {
    syncFireCount.value++
  },
  { flush: 'sync' }
)

// flush: 'pre'（デフォルト）— コンポーネント自身のDOM更新より前にまとめて実行される。
// そのため、この時点で counterEl の中身はまだ更新前の値。
watch(counter, () => {
  preFireCount.value++
  preDomSnapshot.value = counterEl.value?.textContent ?? ''
})

// flush: 'post' — コンポーネントのDOM更新が終わった後に実行される。
// そのため、この時点で counterEl の中身は既に更新済み。
watch(
  counter,
  () => {
    postFireCount.value++
    postDomSnapshot.value = counterEl.value?.textContent ?? ''
  },
  { flush: 'post' }
)

function bumpCounterThreeTimes() {
  counter.value++
  counter.value++
  counter.value++
}
</script>

<style scoped>
.demo-block + .demo-block {
  margin-top: 1.5rem;
}

.demo-block h4 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.lead {
  font-size: 0.82rem;
  color: var(--color-text-disabled);
  margin-bottom: 0.75rem;
  line-height: 1.7;
}

.control-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.control-row button,
.demo-block > button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
}

.control-row button:hover,
.demo-block > button:hover {
  background: var(--color-accent-bg-hover);
}

.demo-block > button {
  margin-bottom: 0.75rem;
}

.computed-line {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.side-note {
  margin-top: 0.75rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  background: var(--color-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
}

.target-line {
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.target-line span {
  color: var(--color-accent);
  font-weight: 700;
}

.tick-table,
.flush-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

.tick-table td,
.flush-table th,
.flush-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.flush-table th {
  color: var(--color-text-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
}

.tick-value {
  color: var(--color-accent);
  font-weight: 700;
}

.count-cell {
  color: var(--color-accent);
  font-weight: 700;
}
</style>
