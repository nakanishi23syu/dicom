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
  color: var(--color-text-heading);
}

.unit-subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.unit-body {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.analogy-box {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border-strong);
  border-left: 3px solid var(--color-accent);
  border-radius: 6px;
  padding: 0.9rem 1.1rem;
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-text);
}

.analogy-box h3 {
  margin: 0 0 0.4rem;
  font-size: 0.8rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.react-box {
  background: var(--color-purple-bg);
  border: 1px solid var(--color-purple-border);
  border-left: 3px solid var(--color-purple);
  border-radius: 6px;
  padding: 0.9rem 1.1rem;
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--color-text);
}

.react-box h3 {
  margin: 0 0 0.4rem;
  font-size: 0.8rem;
  color: var(--color-purple);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.react-box :deep(code) {
  background: var(--color-purple-code-bg);
  color: var(--color-purple-code-text);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.unit-body :deep(code) {
  background: var(--color-surface-alt);
  color: var(--color-accent);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.85em;
}
</style>
