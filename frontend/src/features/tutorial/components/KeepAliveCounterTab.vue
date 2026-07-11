<!--
  ======================================================
  KeepAliveCounterTab.vue — 単元12のKeepAliveデモで使う子コンポーネント
  ======================================================
  ローカルにcountを持つだけの単純なコンポーネント。
  マウントされるたびに count は 0 から始まる。
  KeepAliveでキャッシュされていれば、非表示→再表示してもこのcountは保持される。
-->

<template>
  <div class="tab-content">
    <p class="tab-label">{{ label }} のローカルcount</p>
    <p class="tab-count">{{ count }}</p>
    <button @click="count++">count++</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  label: string
}>()

// このrefはコンポーネントインスタンスに紐づく。
// インスタンスが破棄されれば当然消えるが、KeepAliveでキャッシュされていれば
// インスタンスごと保持されるため、再表示時も値が残る。
const count = ref(0)
</script>

<style scoped>
.tab-content {
  background: var(--color-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
}

.tab-label {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: 0.3rem;
}

.tab-count {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
}

.tab-content button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
  font-size: 0.8rem;
}
</style>
