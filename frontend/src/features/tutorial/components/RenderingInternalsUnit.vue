<!--
  ======================================================
  RenderingInternalsUnit.vue — 単元8: 仮想DOMとレンダリングの仕組み
  ======================================================
  ここで学ぶこと:
    - テンプレートは「h()関数の呼び出し」にコンパイルされる糖衣構文にすぎない
    - VNode（仮想DOMノード）とは何か
    - PatchFlags・静的ホイスティング・Block Tree による高速化の仕組み
    - 「Vue 3はReactより仮想DOM差分が速い」と言われる理由
-->

<template>
  <TutorialUnitShell
    title="単元8: 仮想DOMとレンダリングの仕組み"
    subtitle="テンプレートは何にコンパイルされているのか"
  >
    <!-- ── デモ1: h()関数だけで書いたコンポーネント ──────── -->
    <div class="demo-block">
      <h4>デモ1: テンプレートなし・h()関数だけのコンポーネント</h4>
      <p class="lead">
        右のカウンターは
        <code>&lt;template&gt;</code>
        を一切使わず、
        <code>h()</code>
        関数だけで組み立てられている （
        <code>RenderingHFunctionDemo.vue</code>
        の中身を実際に見てみてほしい）。 普段書いているテンプレートは、ビルド時にこれと同じ形の
        JavaScript関数（Render関数）へと自動的に変換されているだけ。
      </p>
      <RenderingHFunctionDemo />
    </div>

    <!-- ── デモ2: テンプレートは何にコンパイルされるか ────── -->
    <div class="demo-block">
      <h4>デモ2: テンプレート → コンパイル後の疑似コード</h4>
      <p class="lead">
        次のテンプレートを例に、実際にVueのコンパイラが生成するコードに近い形を示す
        （簡略化した疑似コードであり、完全な出力そのものではない）。
      </p>

      <div class="code-compare">
        <div class="code-col">
          <p class="code-col-title">テンプレート（あなたが書くコード）</p>
          <pre class="code-box"><code>&lt;div&gt;
  &lt;p class="title"&gt;固定テキスト&lt;/p&gt;
  &lt;p&gt;&#123;&#123; count &#125;&#125;&lt;/p&gt;
&lt;/div&gt;</code></pre>
        </div>
        <div class="code-col">
          <p class="code-col-title">コンパイル後（疑似コード）</p>
          <pre
            class="code-box"
          ><code>// "固定テキスト"のvnodeは1度だけ作られ使い回される（静的ホイスティング）
const _hoisted_1 = _createElementVNode(
  "p", { class: "title" }, "固定テキスト"
)

function render(_ctx) {
  return _createElementBlock("div", null, [
    _hoisted_1, // ← 毎回作り直さない
    _createElementVNode(
      "p", null, _toDisplayString(_ctx.count),
      1 /* TEXT パッチフラグ */
    ),
  ])
}</code></pre>
        </div>
      </div>

      <p class="lead">
        <code>1 /* TEXT */</code>
        という数値が「パッチフラグ（PatchFlag）」。
        「このノードは中身のテキストだけが変わりうる」という情報を
        コンパイラが事前にVNodeへ焼き込んでおくことで、更新時に
        「タグ名が変わったか」「属性が変わったか」まで含めた総当たりの差分比較をせず、
        テキスト部分だけをピンポイントで書き換えられるようになる。
      </p>
    </div>

    <!-- ── デモ3: 静的ホイスティングの体感 ─────────────── -->
    <div class="demo-block">
      <h4>デモ3: 静的な要素は再生成されない（静的ホイスティング）</h4>
      <p class="lead">
        ボタンを押して
        <code>tickCount</code>
        を増やしても、下の「動かない説明文」は
        まったく再生成されない。コンパイラが「これは静的で二度と変わらない」と
        判断した要素は最初の1回だけVNodeを作り、以降は使い回す （React
        にはこの最適化は存在せず、コンポーネントが再実行されるたびに
        静的な部分も含めて毎回JSX全体を評価し直す）。
      </p>
      <button class="tick-btn" @click="tickCount++">tickCount を増やす（{{ tickCount }}）</button>
      <p class="static-note">
        この文章はテンプレート上「動的な部分を一切含まない」ため、 static hoisting
        によって初回描画時に1度だけVNode化され、 以後 tickCount
        が何回変わっても再生成されずそのまま使い回される。
      </p>
    </div>

    <template #analogy>
      <p>
        h()関数は「家具の設計図を1個作る関数」。
        テンプレートは、その設計図をたくさん書くための「読みやすい略記法」にすぎない。
        コンパイラが裏で略記法を正式な設計図（h()呼び出し）に書き直している。
      </p>
      <p>
        PatchFlag・静的ホイスティングは「模様替えの指示書に付箋を貼っておく」ようなもの。
        部屋（画面）の模様替えのたびに部屋全体を隅々までチェックするのではなく、
        「ここは変わるかもしれない」と付箋（PatchFlag）が貼られた家具だけを
        ピンポイントでチェックしに行く。付箋のない家具（静的な部分）は そもそも二度と見に行かない。
      </p>
    </template>

    <template #react>
      <p>
        Reactにも
        <code>React.createElement()</code>
        （JSXのコンパイル先）という、
        h()に相当する関数がある。JSXも「テンプレートではなくJavaScript式」を
        コンパイルしている点は同じ発想。
      </p>
      <p>
        大きな違いは最適化のタイミング。Reactは基本的に
        「コンポーネント関数が再実行されるたびに、毎回すべてのJSXを評価し直し、
        前回の仮想DOMツリーと今回のツリーを丸ごと比較する」。 これを避けたい場合は
        <code>React.memo</code>
        や
        <code>useMemo</code>
        を使って開発者自身が手動で「ここは再計算不要」と 指示する必要がある。
      </p>
      <p>
        Vueはテンプレートというコンパイル対象があるからこそ、
        コンパイラが自動で「ここは静的」「ここは動的」を解析し、
        PatchFlagsや静的ホイスティングを自動的に埋め込める。
        開発者が手動で最適化を指示しなくても、コンパイラが代わりにやってくれる （ただし h()
        を手書きした場合はこの自動最適化の恩恵を受けられず、
        Reactの素のJSXと同程度の総当たり差分になる）。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import RenderingHFunctionDemo from './RenderingHFunctionDemo.vue'

const tickCount = ref(0)
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

.code-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.code-col-title {
  font-size: 0.72rem;
  color: var(--color-accent);
  margin-bottom: 0.35rem;
}

.code-box {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem;
  font-size: 0.75rem;
  line-height: 1.6;
  color: var(--color-text);
  overflow-x: auto;
  white-space: pre;
}

.tick-btn {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
  margin-bottom: 0.75rem;
}

.tick-btn:hover {
  background: var(--color-accent-bg-hover);
}

.static-note {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
}
</style>
