<!--
  ======================================================
  BaseModal.vue — 汎用モーダル（ポップアップ）
  ======================================================
  features/series/components/SeriesModal.vue で使っていた
  「Teleport + オーバーレイ + ✕ボタン」の型を、中身を問わない汎用部品として切り出したもの。

  NotificationModal.vue（通知ポップアップ）・ConfirmDialog.vue（yes/noポップアップ）は
  どちらもこのBaseModalの上に組み立てている。

  【使い方】
    <BaseModal v-model="isOpen" title="タイトル">
      本文はここにお好きな内容を書ける（デフォルトスロット）

      <template #footer>
        <CancelButton @click="isOpen = false" />
        <SaveButton @click="onSave" />
      </template>
    </BaseModal>

  【v-model について】
  `v-model="isOpen"` は `:model-value="isOpen" @update:model-value="isOpen = $event"` の糖衣構文。
  モーダルの開閉状態を親のref変数1つで管理できるようにするための、Vueの標準的なやり方。
-->

<template>
  <Teleport to="body">
    <!--
      Transition でオーバーレイ＋モーダルにフェード等のアニメーションを付けられるが、
      ここでは学習コスト優先でシンプルに v-if の出し分けのみにしている。
    -->
    <div v-if="modelValue" class="overlay" @click.self="handleClose">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <!-- title propが無ければ header名前付きスロットで自由にタイトル部分を差し替えられる -->
          <div class="modal-title">
            <slot name="header">
              <h2 v-if="title">{{ title }}</h2>
            </slot>
          </div>
          <button class="close-btn" aria-label="閉じる" @click="handleClose">✕</button>
        </div>

        <div class="modal-body">
          <!-- デフォルトスロット: モーダルの本文 -->
          <slot />
        </div>

        <!-- footerスロットに中身が渡された場合だけフッターを表示する -->
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted } from 'vue'

const props = defineProps<{
  // 開閉状態。v-model="xxx" で親のref変数と双方向に紐付ける。
  modelValue: boolean
  // 簡易的にタイトル文字列だけ渡したい場合はこちら。
  // もっと凝ったヘッダーにしたい場合は #header 名前付きスロットを使う。
  title?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  // 「閉じる操作が起きた」ことそのものに反応したい親向けのイベント（v-modelと合わせて発火する）。
  close: []
}>()

function handleClose() {
  emit('update:modelValue', false)
  emit('close')
}

// ======================================================
// Escキーで閉じる
// ======================================================
// オーバーレイの<div>に@keydown.escを付けても、その要素にフォーカスが
// 無ければキーイベントは発火しない。モーダルは「開いている間だけ」
// windowにキーイベントを直接張るのが確実。modelValueの変化を監視して
// リスナーの追加・削除を切り替える。
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true }
)

// コンポーネント自体が破棄されるときにリスナーが残らないよう後始末する。
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 480px;
  max-width: 95vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title h2 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-text-heading);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0 0.25rem;
  line-height: 1;
  transition: color 0.15s;
}

.close-btn:hover {
  color: var(--color-text-heading);
}

.modal-body {
  overflow-y: auto;
  padding: 1.25rem;
  font-size: 0.88rem;
  color: var(--color-text);
  line-height: 1.7;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
}
</style>
