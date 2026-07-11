<!--
  ======================================================
  SlotsCardBox.vue — 単元6で使う「枠」コンポーネント
  ======================================================
  カードの見た目（枠・タイトル・フッター位置）だけを担当し、
  実際に表示する中身は呼び出し側が自由に決められるようにする。
-->

<template>
  <div class="card">
    <div class="card-title">{{ title }}</div>

    <!--
      デフォルトスロット: <SlotsCardBox>ここ</SlotsCardBox> の「ここ」が入る。
    -->
    <div class="card-body">
      <slot />
    </div>

    <!--
      スコープ付きスロット（Scoped Slot）。
      slot に "属性" を渡すと、呼び出し側はその値を受け取って
      表示内容をカスタマイズできる。
      ここでは「今何件目/全何件」という進捗情報を子から親へ渡している。
    -->
    <div class="card-footer">
      <slot name="footer" :current="current" :total="total">
        <!-- footer スロットに何も渡されなかった場合のデフォルト表示 -->
        {{ current }} / {{ total }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  current: number
  total: number
}>()
</script>

<style scoped>
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  overflow: hidden;
}

.card-title {
  background: var(--color-surface-alt);
  padding: 0.5rem 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-accent);
}

.card-body {
  padding: 0.9rem;
  font-size: 0.85rem;
  color: var(--color-text);
}

.card-footer {
  padding: 0.4rem 0.9rem;
  font-size: 0.75rem;
  color: var(--color-text-disabled);
  border-top: 1px solid var(--color-border);
}
</style>
