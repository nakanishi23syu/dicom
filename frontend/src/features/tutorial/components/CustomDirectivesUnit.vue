<!--
  ======================================================
  CustomDirectivesUnit.vue — 単元12: v-once・v-memo・カスタムディレクティブ・KeepAlive
  ======================================================
  ここで学ぶこと:
    - v-once（初回だけ描画し、以後は更新しない）
    - v-memo（指定した依存が変わらない限り再描画をスキップする。書き忘れると表示が古いまま固まる罠つき）
    - カスタムディレクティブの全ライフサイクルフック
    - KeepAlive によるコンポーネントインスタンスの状態保持
-->

<template>
  <TutorialUnitShell
    title="単元12: v-once・v-memo・カスタムディレクティブ・KeepAlive"
    subtitle="描画を意図的にスキップする仕組みと、状態を保持する仕組み"
  >
    <!-- ── デモ1: v-once ──────────────────────────────────── -->
    <div class="demo-block">
      <h4>デモ1: v-once（初回だけ描画）</h4>
      <p class="lead">
        <code>tickCount</code>
        を増やしても、
        <code>v-once</code>
        を付けた段落は初回描画時の値のまま固まる。
      </p>
      <button @click="tickCount++">tickCount を増やす（{{ tickCount }}）</button>
      <p v-once class="once-line">v-once: 初回描画時の値 = {{ tickCount }}</p>
      <p class="normal-line">通常の描画: 今の値 = {{ tickCount }}</p>
    </div>

    <!-- ── デモ2: v-memo ──────────────────────────────────── -->
    <div class="demo-block">
      <h4>デモ2: v-memo（依存が変わらない限り再描画をスキップ）</h4>
      <p class="lead">
        各行に
        <code>v-memo="[row.value]"</code>
        を付けている。 「valueを増やす」は依存に含まれているので再描画されるが、
        「unrelatedを増やす」は依存に含まれていないため、
        <strong>データが変わっても表示が更新されない（罠）</strong>
        。
      </p>
      <div class="control-row">
        <button @click="bumpValue">行1の value を増やす（再描画される）</button>
        <button @click="bumpUnrelated">行1の unrelated を増やす（表示が固まる）</button>
      </div>
      <div
        v-for="row in memoRows"
        :key="row.id"
        v-memo="[row.value]"
        v-track-render="row.id"
        class="memo-row"
      >
        <span>{{ row.label }}: value={{ row.value }} / unrelated={{ row.unrelated }}</span>
        <span class="render-count">この行が再描画された回数: {{ renderCounts[row.id] }}</span>
      </div>
    </div>

    <!-- ── デモ3: カスタムディレクティブのライフサイクル ──── -->
    <div class="demo-block">
      <h4>デモ3: カスタムディレクティブの全フック</h4>
      <p class="lead">
        <code>v-log-lifecycle</code>
        という自作ディレクティブを付けた要素の
        表示/非表示・中身の更新を行うと、コンポーネントと同じ7つのフック （created / beforeMount /
        mounted / beforeUpdate / updated / beforeUnmount /
        unmounted）が発火する様子をログで確認できる。
      </p>
      <div class="control-row">
        <button @click="toggleLifecycleDemo">
          {{ showLifecycleDemo ? '非表示にする（unmount）' : '表示する（mount）' }}
        </button>
        <button :disabled="!showLifecycleDemo" @click="updateLifecycleLabel">
          中身を更新する（update）
        </button>
        <button @click="lifecycleLog.length = 0">ログをクリア</button>
      </div>
      <div v-if="showLifecycleDemo" v-log-lifecycle class="lifecycle-box">
        {{ lifecycleLabel }}
      </div>
      <ol class="lifecycle-log">
        <li v-for="(entry, i) in lifecycleLog" :key="i">{{ entry }}</li>
      </ol>
    </div>

    <!-- ── デモ4: KeepAlive ───────────────────────────────── -->
    <div class="demo-block">
      <h4>デモ4: KeepAlive によるインスタンスの状態保持</h4>
      <p class="lead">
        タブA・タブBはそれぞれ独立したローカルcountを持つ。
        KeepAliveを有効にした状態でcountを増やしてから別タブへ切り替え、
        また戻ってみてほしい。有効時は値が保持され、無効時は0にリセットされる
        （＝コンポーネントインスタンスごと作り直されている）。
      </p>
      <div class="control-row">
        <button @click="activeTab = 'A'">タブA</button>
        <button @click="activeTab = 'B'">タブB</button>
        <label class="checkbox-label">
          <input v-model="useKeepAlive" type="checkbox" />
          KeepAliveを使う
        </label>
      </div>

      <KeepAlive v-if="useKeepAlive">
        <KeepAliveCounterTab :key="activeTab" :label="activeTab" />
      </KeepAlive>
      <KeepAliveCounterTab v-else :key="activeTab" :label="activeTab" />
    </div>

    <template #analogy>
      <p>
        <code>v-once</code>
        は「写真を1枚撮って飾る」。以後、被写体（データ）が
        変わっても、飾ってある写真は撮った瞬間のまま。
      </p>
      <p>
        <code>v-memo</code>
        は「指定した項目だけを見て、変わっていなければ
        棚卸しをサボる倉庫番」。依存に入れ忘れた項目は倉庫番が一切チェックしないため、
        実際には中身が変わっていても「変わっていないはず」として無視されてしまう
        （デモ2の「unrelated」がまさにこれ）。
      </p>
      <p>
        KeepAliveは「使っていない部屋を取り壊さず、鍵をかけて保管しておく」仕組み。
        別の部屋（タブ）に移っても、元の部屋の家具（コンポーネントの状態）は
        そのまま残る。KeepAliveを使わない場合は、部屋を出るたびに解体し、
        戻ってくるときは更地から建て直す。
      </p>
    </template>

    <template #react>
      <p>
        <code>v-once</code>
        に相当する標準機能はReactにはない。近いことをするには
        <code>useMemo(() =&gt; content, [])</code>
        のように空の依存配列を使うか、コンポーネントを
        <code>React.memo</code>
        で包んで親の再レンダーの影響を遮断する必要がある。
      </p>
      <p>
        <code>v-memo</code>
        は
        <code>React.memo(Component, areEqual)</code>
        や
        <code>useMemo(() =&gt; jsx, deps)</code>
        に近い発想。「依存配列に何を入れるか」を開発者が正しく管理する責任があり、
        依存の書き忘れによって表示が古くなるバグの起きやすさもReactと共通の弱点。
      </p>
      <p>
        カスタムディレクティブという概念自体、Reactには存在しない
        （ReactはJSXの中でDOM操作を直接行うことを避ける設計思想のため）。
        近い効果を得たい場合はカスタムフック＋
        <code>ref</code>
        を組み合わせて自前で実装することになる。
      </p>
      <p>
        KeepAliveに直接対応する標準機能はReactにはないが、 コミュニティライブラリ（
        <code>react-activation</code>
        等）で似た挙動を再現する例がある。Reactの標準機能だけで状態を保持したい場合は、
        コンポーネントをアンマウントせずCSSで
        <code>display: none</code>
        にして常時マウントし続ける、という力技で代替することが多い。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref, reactive, type Directive } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import KeepAliveCounterTab from './KeepAliveCounterTab.vue'

// ======================================================
// デモ1: v-once
// ======================================================
const tickCount = ref(0)

// ======================================================
// デモ2: v-memo
// ======================================================
interface MemoRow {
  id: number
  label: string
  value: number
  unrelated: number
}

const memoRows = reactive<MemoRow[]>([{ id: 1, label: '行1', value: 0, unrelated: 0 }])
const renderCounts = reactive<Record<number, number>>({ 1: 0 })

function bumpValue() {
  memoRows[0].value++
}

function bumpUnrelated() {
  memoRows[0].unrelated++
}

// v-track-render: mounted/updatedのたびに、そのkeyのカウントを増やす自作ディレクティブ。
// v-memoによって再描画がスキップされた場合はupdatedも呼ばれないため、
// このカウントは「実際にDOMへ再描画が反映された回数」を正確に表す。
const vTrackRender: Directive<HTMLElement, number> = {
  mounted(_el, binding) {
    renderCounts[binding.value] = (renderCounts[binding.value] ?? 0) + 1
  },
  updated(_el, binding) {
    renderCounts[binding.value] = (renderCounts[binding.value] ?? 0) + 1
  },
}

// ======================================================
// デモ3: カスタムディレクティブの全ライフサイクルフック
// ======================================================
const showLifecycleDemo = ref(true)
const lifecycleLabel = ref('初期状態')
const lifecycleLog = ref<string[]>([])

function toggleLifecycleDemo() {
  showLifecycleDemo.value = !showLifecycleDemo.value
}

// 【なぜ expectingUpdate というフラグが要るのか】
// beforeUpdate/updated は「このディレクティブの値が変わったとき」ではなく、
// 「このディレクティブが付いた要素を含む親スコープが再描画されるたびに」毎回呼ばれる。
// ログ配列(lifecycleLog)への push 自体もリアクティブな変更なので、
// 何もガードしないと「push → 親スコープが再描画 → beforeUpdate/updatedが再度呼ばれる →
// また push → …」という無限ループになってしまう（実際にこの実装で一度発生した）。
// 「今回のupdateはボタン操作によるものだ」という意図をフラグで明示し、
// 意図しない再描画では何もログに残さないようにすることでループを防いでいる。
let expectingUpdate = false

function updateLifecycleLabel() {
  expectingUpdate = true
  lifecycleLabel.value = lifecycleLabel.value === '初期状態' ? '更新後の状態' : '初期状態'
}

// ディレクティブのフックは、コンポーネントのライフサイクルフックとほぼ同じ名前・タイミングで
// 用意されている。第1引数がDOM要素、第2引数(binding)にディレクティブへ渡した値などが入る。
// created/beforeMount/mounted/beforeUnmount/unmounted は
// マウント・アンマウントの1回の遷移につき1回しか呼ばれないため無条件にログしてよいが、
// beforeUpdate/updated だけは expectingUpdate フラグで意図した更新のときだけログする。
const vLogLifecycle: Directive<HTMLElement> = {
  created() {
    lifecycleLog.value.push('created（属性が設定される前）')
  },
  beforeMount() {
    lifecycleLog.value.push('beforeMount（まだDOMに挿入されていない）')
  },
  mounted() {
    lifecycleLog.value.push('mounted（DOMに挿入された）')
  },
  beforeUpdate() {
    if (!expectingUpdate) return
    lifecycleLog.value.push('beforeUpdate（更新前）')
  },
  updated() {
    if (!expectingUpdate) return
    expectingUpdate = false
    lifecycleLog.value.push('updated（更新後）')
  },
  beforeUnmount() {
    lifecycleLog.value.push('beforeUnmount（まだ削除されていない）')
  },
  unmounted() {
    lifecycleLog.value.push('unmounted（DOMから削除された）')
  },
}

// ======================================================
// デモ4: KeepAlive
// ======================================================
const activeTab = ref<'A' | 'B'>('A')
const useKeepAlive = ref(true)
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

.demo-block > button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
  margin-bottom: 0.75rem;
}

.demo-block > button:hover {
  background: var(--color-accent-bg-hover);
}

.once-line {
  font-size: 0.85rem;
  color: var(--color-warning);
  margin-top: 0.5rem;
}

.normal-line {
  font-size: 0.85rem;
  color: var(--color-success);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
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

.control-row button:hover:not(:disabled) {
  background: var(--color-accent-bg-hover);
}

.control-row button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.checkbox-label {
  font-size: 0.82rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.memo-row {
  display: flex;
  justify-content: space-between;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  font-size: 0.82rem;
  color: var(--color-text);
}

.render-count {
  color: var(--color-accent);
}

.lifecycle-box {
  background: var(--color-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.lifecycle-log {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  padding-left: 1.2rem;
  max-height: 180px;
  overflow-y: auto;
}
</style>
