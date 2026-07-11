<!--
  ======================================================
  TutorialUnitShell.vue — 各単元の共通レイアウト
  ======================================================
  全ての単元コンポーネント（ReactivityUnit, DirectivesUnit ...）は
  このコンポーネントで中身を包んで表示する。
  「タイトル・説明文・デモ本体・Reactとの違い」という同じ構造を
  毎回書くのは無駄なので、共通部分をここに切り出した。

  これ自体が「Slots（スロット）」の実例になっている。
  中身は各単元コンポーネント側で自由に書けるようにして、
  枠（見た目・レイアウト）だけをこちらで用意する、という関係。
-->

<template>
  <section class="unit-shell">
    <header class="unit-header">
      <h2>{{ title }}</h2>
      <p v-if="subtitle" class="unit-subtitle">{{ subtitle }}</p>
    </header>

    <!--
      デフォルトスロット。
      <TutorialUnitShell>ここに書いた内容</TutorialUnitShell> の
      「ここに書いた内容」がまるごとこの <slot /> の位置に差し込まれる。
    -->
    <div class="unit-body">
      <slot />
    </div>

    <!--
      「analogy」という名前付きスロット（Named Slot）。
      <template #analogy> ... </template> で内容を渡された場合だけ表示する。
      $slots.analogy は「analogy という名前のスロットに中身が渡されているか」を返す。
    -->
    <div v-if="$slots.analogy" class="analogy-box">
      <h3>たとえ話</h3>
      <slot name="analogy" />
    </div>

    <!--
      「react」という名前付きスロット。
      React経験者向けの比較説明をここに差し込む。
    -->
    <aside v-if="$slots.react" class="react-box">
      <h3>⚛ Reactとの違い</h3>
      <slot name="react" />
    </aside>
  </section>
</template>

<script setup lang="ts">
// Props: タイトルと（任意の）サブタイトルだけを受け取る。
// 中身（デモ・たとえ話・React比較）は全てスロット経由で受け取るため、
// Props は最小限で済む。
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.unit-shell {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.unit-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #e2e8f0;
}

.unit-subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: #8b9ab3;
}

.unit-body {
  background: #111827;
  border: 1px solid #1e2535;
  border-radius: 8px;
  padding: 1.25rem;
}

.analogy-box {
  background: #1a2133;
  border: 1px solid #2a3f5f;
  border-left: 3px solid #7eb8f7;
  border-radius: 6px;
  padding: 0.9rem 1.1rem;
  font-size: 0.88rem;
  line-height: 1.7;
  color: #c8d6e5;
}

.analogy-box h3 {
  margin: 0 0 0.4rem;
  font-size: 0.8rem;
  color: #7eb8f7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.react-box {
  background: #1f1a2e;
  border: 1px solid #3a2f5f;
  border-left: 3px solid #a78bfa;
  border-radius: 6px;
  padding: 0.9rem 1.1rem;
  font-size: 0.88rem;
  line-height: 1.7;
  color: #c8d6e5;
}

.react-box h3 {
  margin: 0 0 0.4rem;
  font-size: 0.8rem;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.react-box :deep(code) {
  background: #2a2440;
  color: #d6c9ff;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.unit-body :deep(code) {
  background: #1a2133;
  color: #7eb8f7;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}
</style>
