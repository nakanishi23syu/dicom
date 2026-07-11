<!--
  ======================================================
  ReactivityUnit.vue — 単元1: テンプレート構文とリアクティビティ
  ======================================================
  ここで学ぶこと:
    - {{ 補間 }} で値を表示する
    - ref() でリアクティブな値を作る
    - computed() で「値から自動計算される値」を作る
    - v-bind（:属性）で属性・スタイルを動的に変える
    - @click などのイベントハンドラ
    - v-model で入力欄と値を双方向にバインドする
-->

<template>
  <TutorialUnitShell
    title="単元1: テンプレート構文とリアクティビティ"
    subtitle="ref / computed / v-bind / v-model の基本"
  >
    <!-- ── デモ1: カウンター ─────────────────────────────── -->
    <div class="demo-block">
      <h4>デモ1: カウンター（ref + computed + v-bind）</h4>

      <div class="counter-row">
        <button @click="count--">−</button>
        <!--
          {{ count }} は「補間（Interpolation, 文字列展開）」と呼ばれる構文。
          count.value ではなく count と書くだけでいい。
          これは <script setup> 内のトップレベルの ref が、
          テンプレート内では自動で .value が外れて（unwrap されて）扱われるため。
        -->
        <span class="count-value" :style="countStyle">{{ count }}</span>
        <button @click="count++">＋</button>
      </div>

      <!--
        computed() で作った doubled は「count に連動して自動更新される値」。
        count が変わるたびに doubled を再計算するコードを自分で書く必要はない。
      -->
      <p class="computed-line">
        2倍の値（computed）:
        <strong>{{ doubled }}</strong>
      </p>
    </div>

    <!-- ── デモ2: v-model による双方向バインディング ─────── -->
    <div class="demo-block">
      <h4>デモ2: 入力欄との双方向バインディング（v-model）</h4>

      <!--
        v-model="name" は以下の糖衣構文（シンタックスシュガー）:
          :value="name" @input="name = $event.target.value"
        を1行にまとめたもの。
      -->
      <input v-model="name" placeholder="名前を入力してください" class="text-input" />
      <p class="computed-line">
        こんにちは、
        <strong>{{ name || '（未入力）' }}</strong>
        さん！
        <!-- computed の別例: 文字列を反転させるだけの単純な計算値 -->
        逆から読むと「{{ reversedName }}」
      </p>
    </div>

    <!-- ── たとえ話 ────────────────────────────────────── -->
    <template #analogy>
      <p>
        <code>ref()</code>
        は「センサー付きの変数」だと考えるとわかりやすい。 普通の変数（
        <code>let count = 0</code>
        ）はただの値の入れ物だが、
        <code>ref(0)</code>
        は値が変わったことを検知するセンサーが内蔵されている。
        センサーが反応すると、その値を使っている画面（テンプレート）に
        「値が変わったので描画し直して」と自動的に通知が飛ぶ。
      </p>
      <p>
        <code>computed()</code>
        は「レシピ付きの自動計算セル」。 表計算ソフトの
        <code>=A1*2</code>
        のようなセルをイメージすると近い。 元の値（A1 =
        count）が変わると、レシピ（*2）に従って自動で再計算される。 自分で「count が変わったら
        doubled も更新する」処理を書く必要がない。
      </p>
    </template>

    <!-- ── Reactとの違い ──────────────────────────────── -->
    <template #react>
      <p>
        Reactの
        <code>useState</code>
        は「値」と「更新関数」のペアを返す （
        <code>const [count, setCount] = useState(0)</code>
        ）。 値を変えるには必ず
        <code>setCount(count + 1)</code>
        のように 更新関数を呼ぶ必要がある。
      </p>
      <p>
        Vueの
        <code>ref()</code>
        は1つのオブジェクト（
        <code>{ value: 0 }</code>
        ）を返すだけで、 更新関数は存在しない。
        <code>count.value++</code>
        のように 直接
        <code>.value</code>
        を書き換えると、それだけで画面が更新される （テンプレート内では
        <code>.value</code>
        は省略できる）。
      </p>
      <p>
        <code>computed()</code>
        はReactの
        <code>useMemo(() => count * 2, [count])</code>
        に近い。ただし Vue は依存配列（
        <code>[count]</code>
        ）を手で書く必要がない。 computed の中で使った ref を自動で追跡して、
        依存関係を勝手に判定してくれる。
      </p>
      <p>
        JSXの
        <code>{'{count}'}</code>
        による式展開と、 Vueの
        <code>&#123;&#123; count &#125;&#125;</code>
        による補間はほぼ同じ役割。 イベントも
        <code>onClick={() =&gt; setCount(c =&gt; c + 1)}</code>
        が
        <code>@click="count++"</code>
        に対応する。
      </p>
      <p>
        <code>v-model</code>
        にはReact側に直接対応する構文がない。 Reactで同じ双方向バインディングをするには
        <code>value={name} onChange={e =&gt; setName(e.target.value)}</code>
        のように「制御されたコンポーネント（Controlled Component）」として
        自分で2行書く必要がある。v-model はこれを1行に圧縮した糖衣構文。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'

// ======================================================
// ref() — リアクティブな単一の値を作る
// ======================================================
// ref(0) は { value: 0 } のようなオブジェクトを作り、
// .value の変更を Vue が追跡できるようにする。
const count = ref(0)

// テキスト入力用の ref。v-model でこの ref と <input> を双方向に結びつける。
const name = ref('')

// ======================================================
// computed() — 他のリアクティブな値から自動計算される値
// ======================================================
// 引数に渡した関数（ゲッター）の中で使われた ref（ここでは count）を
// Vue が自動的に検知し、count が変わるたびに doubled を再計算する。
// 「count * 2 を毎回自分で計算し直すコード」を書かなくてよくなる。
const doubled = computed(() => count.value * 2)

// computed のもう一つの例: 文字列を反転する。
// split('') → 1文字ずつの配列 / reverse() → 反転 / join('') → 文字列に戻す
const reversedName = computed(() => name.value.split('').reverse().join(''))

// ======================================================
// v-bind（:style）で使う computed
// ======================================================
// count の符号によって文字色を変える。
// v-bind は :属性名="式" の形で、式の結果を属性値として渡す。
const countStyle = computed(() => ({
  color:
    count.value > 0
      ? 'var(--color-success)'
      : count.value < 0
        ? 'var(--color-danger)'
        : 'var(--color-text)',
}))
</script>

<style scoped>
.demo-block + .demo-block {
  margin-top: 1.5rem;
}

.demo-block h4 {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.counter-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.counter-row button {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 6px;
  border: 1px solid var(--color-border-strong);
  background: var(--color-accent-bg);
  color: var(--color-accent);
  font-size: 1.1rem;
  cursor: pointer;
}

.counter-row button:hover {
  background: var(--color-accent-bg-hover);
}

.count-value {
  min-width: 3ch;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
}

.computed-line {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.text-input {
  width: 100%;
  max-width: 320px;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
}

.text-input:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
