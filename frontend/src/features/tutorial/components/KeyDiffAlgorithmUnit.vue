<!--
  ======================================================
  KeyDiffAlgorithmUnit.vue — 単元11: keyと差分アルゴリズム
  ======================================================
  ここで学ぶこと:
    - :key="index" が引き起こす「DOM要素の使い回しミス」を実際に体感する
    - Vue 3の keyed diff アルゴリズムが何をしているか（概念レベル）
-->

<template>
  <TutorialUnitShell
    title="単元11: keyと差分アルゴリズム"
    subtitle="なぜ :key='index' は危険なのか、実際に手を動かして確認する"
  >
    <div class="demo-block">
      <h4>デモ: 両方のinputに何か文字を入力してから、下のボタンを押してみて</h4>
      <p class="lead">
        2つのリストは同じデータから作られている。違いは
        <code>:key</code>
        に何を使っているかだけ。
        入力欄に文字を入れてから「先頭に追加」または「シャッフル」を押すと、 左（
        <code>:key="index"</code>
        ）は入力した文字とラベルの対応がズレるが、 右（
        <code>:key="row.id"</code>
        ）はラベルと一緒に正しく移動する。
      </p>

      <div class="control-row">
        <button @click="prependItem">先頭に要素を追加</button>
        <button @click="shuffle">シャッフル</button>
        <button @click="reset">リセット</button>
      </div>

      <div class="key-compare">
        <div class="key-col">
          <p class="key-col-title">✗ :key="index"（悪い例）</p>
          <div v-for="(row, index) in rows" :key="index" class="key-row">
            <span class="key-label">{{ row.label }}</span>
            <input placeholder="ここに入力" class="key-input" />
          </div>
        </div>
        <div class="key-col">
          <p class="key-col-title">✓ :key="row.id"（良い例）</p>
          <div v-for="row in rows" :key="row.id" class="key-row">
            <span class="key-label">{{ row.label }}</span>
            <input placeholder="ここに入力" class="key-input" />
          </div>
        </div>
      </div>
    </div>

    <div class="demo-block">
      <h4>Vue 3のkeyed diffアルゴリズム（概念）</h4>
      <p class="lead">
        Vue 3は配列の前後の差分を検出するとき、大まかに次のような手順で
        「DOMの移動を最小限にする」よう最適化している。
      </p>
      <ol class="algo-steps">
        <li>先頭から見て、keyが一致する要素は位置も同じならスキップ（共通の先頭部分）</li>
        <li>末尾から見て、同様にkeyが一致する要素をスキップ（共通の末尾部分）</li>
        <li>
          残った中間部分だけを比較し、新しい並びの中で「すでに正しい相対順序になっている
          部分列（最長増加部分列 = LIS）」を求める。その部分列に含まれる要素は動かさず、
          それ以外の要素だけを実際にDOM上で移動させる
        </li>
        <li>新しく増えたkeyの要素は新規作成し、なくなったkeyの要素は削除する</li>
      </ol>
      <p class="lead">
        例えば
        <code>[A, B, C, D]</code>
        が
        <code>[A, C, B, D]</code>
        に変わった場合、 先頭のAと末尾のDは共通部分としてスキップされ、 中間の
        <code>[B, C]</code>
        →
        <code>[C, B]</code>
        だけが比較対象になる。 ここでは B と C
        を入れ替えるのに「どちらか一方だけを動かせば済む」ため、
        実際のDOM操作は最小限の移動1回で完了する （2つとも作り直す、という無駄な処理はしない）。
      </p>
    </div>

    <template #analogy>
      <p>
        <code>:key</code>
        は「座席に貼る名札」。名札（key）を椅子（DOM要素）に
        貼っておけば、並び順が変わっても「Aさんの椅子」がどれかを正しく追跡できる。
        名札の代わりに「今何番目の席か（index）」を使ってしまうと、
        People（データ）が入れ替わっても椅子はそのままなので、
        本来Aさんが座っていた椅子に別の人の名前が表示され、
        なのに椅子に置いてあった私物（inputの入力内容のようなDOM固有の状態）は
        そのまま残ってしまう。
      </p>
      <p>
        LISベースの最小移動は「引っ越し業者が、すでに正しい順番で並んでいる家具は
        触らず、順番が崩れている家具だけを運び直す」効率化に近い。
        全部の家具をトラックに積み直すのではなく、動かす必要がある分だけ動かす。
      </p>
    </template>

    <template #react>
      <p>
        Reactも配列レンダリングに
        <code>key</code>
        propを要求し、 「indexをkeyに使うと同じ問題が起きる」という注意点もVueとまったく同じ。
        これはVue/React固有の話というより、 「keyed
        diffing」という仮想DOM系フレームワーク共通の設計に由来する。
      </p>
      <p>
        内部アルゴリズムの実装はそれぞれ独自（ReactはFiberアーキテクチャ）だが、
        「keyが一致する要素を再利用し、一致しない要素だけ作成・削除・移動する」という
        基本方針は共通している。Vue 3が公式に「LISを用いて移動回数を最小化する」実装を
        採用している点は実装の詳細差ではあるが、
        ユーザー視点で意識すべき教訓（安定したkeyを使う）はどちらも同じ。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'

interface Row {
  id: number
  label: string
}

// 初期データを関数化しておき、リセット時に同じ形へ戻せるようにする
function createInitialRows(): Row[] {
  return [
    { id: 1, label: '項目A' },
    { id: 2, label: '項目B' },
    { id: 3, label: '項目C' },
  ]
}

const rows = reactive<Row[]>(createInitialRows())
let nextId = 4

function prependItem() {
  rows.unshift({ id: nextId, label: `項目${String.fromCharCode(64 + nextId)}` })
  nextId++
}

function shuffle() {
  // Fisher-Yatesシャッフル
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
  }
}

function reset() {
  rows.splice(0, rows.length, ...createInitialRows())
  nextId = 4
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
  margin-bottom: 1rem;
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

.key-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.key-col-title {
  font-size: 0.78rem;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.key-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.6rem;
  margin-bottom: 0.4rem;
}

.key-label {
  font-size: 0.82rem;
  color: var(--color-text);
  min-width: 4.5em;
  flex-shrink: 0;
}

.key-input {
  flex: 1;
  min-width: 0;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.8rem;
}

.key-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.algo-steps {
  font-size: 0.82rem;
  color: var(--color-text);
  line-height: 1.8;
  padding-left: 1.2rem;
  margin-bottom: 0.75rem;
}
</style>
