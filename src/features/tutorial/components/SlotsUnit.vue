<!--
  ======================================================
  SlotsUnit.vue — 単元6: Slots（コンテンツの差し込み）
  ======================================================
  ここで学ぶこと:
    - デフォルトスロット（<Comp>中身</Comp>）
    - 名前付きスロット（<template #footer>）
    - スコープ付きスロット（子から親にデータを渡しつつ、表示は親が決める）
-->

<template>
  <TutorialUnitShell
    title="単元6: Slots（コンテンツの差し込み）"
    subtitle="親が「枠」を用意し、子は「中身」を自由に選べる"
  >
    <div class="demo-grid">
      <!-- ① デフォルトスロットだけを使う一番シンプルな例 -->
      <SlotsCardBox title="① デフォルトスロット" :current="1" :total="3">
        <p>
          これは
          <code>&lt;SlotsCardBox&gt;</code>
          と
          <code>&lt;/SlotsCardBox&gt;</code>
          の間に書いた内容です。
        </p>
      </SlotsCardBox>

      <!-- ② footer を独自の内容に差し替える例（名前付きスロット） -->
      <SlotsCardBox title="② 名前付きスロット" :current="2" :total="3">
        <p>本文はそのまま。フッターだけ差し替えている。</p>
        <template #footer>
          <span class="custom-footer">🚀 カスタムフッター表示中</span>
        </template>
      </SlotsCardBox>

      <!-- ③ スコープ付きスロット: 子から current/total を受け取って独自表示 -->
      <SlotsCardBox title="③ スコープ付きスロット" :current="3" :total="3">
        <p>フッターで子から受け取った値を使って独自の表示を組み立てている。</p>
        <template #footer="{ current, total }">
          <span class="custom-footer">
            進捗: {{ '★'.repeat(current) }}{{ '☆'.repeat(total - current) }} （{{ current }}件目 /
            全{{ total }}件）
          </span>
        </template>
      </SlotsCardBox>
    </div>

    <template #analogy>
      <p>
        Slot は「額縁（フレーム）だけを用意する画家」。
        <code>SlotsCardBox</code>
        は額縁・タイトルの位置・フッターの位置という
        「枠組み」だけを決め、額縁の中に飾る絵（実際の中身）は 使う側が自由に選べる。
      </p>
      <p>
        スコープ付きスロットは「額縁の裏に小さなメモを貼っておく」イメージ。
        額縁を作った側（子）が「今3件中2件目だよ」というメモ（current/total）を
        こっそり渡しておき、絵を飾る側（親）はそのメモを見ながら 自分の好きなデザインで表示できる。
      </p>
    </template>

    <template #react>
      <p>
        デフォルトスロットはReactの
        <code>{'{children}'}</code>
        Props にほぼそのまま対応する。
        <code>&lt;Card&gt;中身&lt;/Card&gt;</code>
        と書くと Reactでは
        <code>props.children</code>
        に「中身」が入る。
      </p>
      <p>
        名前付きスロットに直接対応する構文はReactにはない。 近い書き方は、複数のProps（例:
        <code>&lt;Card body={...} footer={...} /&gt;</code>
        ）として 要素を複数個Propsで渡す方法。Vueは「タグの中に書く」というHTMLらしい
        書き味を保ったまま複数のスロットを扱える。
      </p>
      <p>
        スコープ付きスロットは、Reactの「Render Props」パターン （
        <code>{'{(current) => &lt;span&gt;{current}&lt;/span&gt;}'}</code>
        のように関数をchildrenとして渡す書き方）に相当する。
        Vueのスコープ付きスロットは特別な構文だが、 やろうとしていることはRender Propsと同じ
        「子から親へデータを渡しつつ、表示は親に委ねる」という発想。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import TutorialUnitShell from './TutorialUnitShell.vue'
import SlotsCardBox from './SlotsCardBox.vue'
</script>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.demo-grid p {
  margin: 0;
  line-height: 1.6;
}

.custom-footer {
  color: #7eb8f7;
}
</style>
