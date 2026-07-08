<!--
  ======================================================
  PropsEmitsCustomInput.vue — 単元3で使う子コンポーネント（v-model対応）
  ======================================================
  自作コンポーネントを v-model に対応させる例。
  親側で <PropsEmitsCustomInput v-model="text" /> のように書けるようにする。
-->

<template>
  <div class="custom-input">
    <!--
      defineModel() が返す ref（model）は、
      親から渡された値を持ち、書き換えると親の値も自動で更新される。
      通常の ref とまったく同じ感覚で v-model="model" と書けるのがポイント。
    -->
    <input v-model="model" placeholder="defineModelで双方向バインディング" />
    <button type="button" class="clear-btn" @click="model = ''">クリア</button>
  </div>
</template>

<script setup lang="ts">
// ======================================================
// defineModel() — v-model 対応コンポーネントを作るマクロ（Vue 3.4+）
// ======================================================
// このマクロ1行で、以下すべてを自動的にやってくれる:
//   1. props に modelValue: string を定義
//   2. emits に 'update:modelValue' を定義
//   3. 親の値が変わったら自動で反映、子で書き換えたら自動で親に通知
//
// defineModel() を使わない場合、素の Props/Emits で同じことをするには
// 下のように自分で書く必要がある（コメントアウトして残しておく）:
//
//   const props = defineProps<{ modelValue: string }>()
//   const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
//   const model = computed({
//     get: () => props.modelValue,
//     set: (value) => emit('update:modelValue', value),
//   })
const model = defineModel<string>({ default: '' })
</script>

<style scoped>
.custom-input {
  display: flex;
  gap: 0.5rem;
}

.custom-input input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #2a3f5f;
  background: #0d1117;
  color: #c8d6e5;
  font-size: 0.9rem;
}

.custom-input input:focus {
  outline: none;
  border-color: #7eb8f7;
}

.clear-btn {
  background: #1e2d45;
  color: #8b9ab3;
  border: 1px solid #2a3f5f;
  border-radius: 6px;
  padding: 0 0.9rem;
  cursor: pointer;
}
</style>
