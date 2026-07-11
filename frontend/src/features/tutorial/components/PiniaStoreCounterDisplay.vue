<!--
  ======================================================
  PiniaStoreCounterDisplay.vue — 単元7で使う子コンポーネント
  ======================================================
  Props も Emits も一切受け取らない。
  useTutorialCounterStore() を直接呼ぶだけで、
  他のコンポーネントと同じ状態を参照できることを示す。
-->

<template>
  <div class="display-box">
    <p class="label">別コンポーネントから見た count</p>
    <p class="value">{{ store.count }}</p>
    <p class="sub">{{ store.isEven ? '偶数' : '奇数' }}</p>
  </div>
</template>

<script setup lang="ts">
import { useTutorialCounterStore } from '../stores/tutorialCounterStore'

// Props でバケツリレーされてきたわけではないのに、
// 親（PiniaStoreUnit.vue）が変更した count がそのままここに反映される。
// これが「Storeはアプリ全体で共有されるシングルトン」であることの実演。
const store = useTutorialCounterStore()
</script>

<style scoped>
.display-box {
  background: var(--color-bg);
  border: 1px dashed var(--color-border-strong);
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
}

.label {
  font-size: 0.75rem;
  color: var(--color-text-disabled);
  margin-bottom: 0.4rem;
}

.value {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-accent);
}

.sub {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
