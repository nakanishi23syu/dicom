<!--
  ======================================================
  ToastContainer.vue — トースト通知の表示領域
  ======================================================
  composables/useToast.ts が持つ通知一覧を画面右下に積み上げ表示する。
  App.vue に1箇所だけ配置すれば、アプリ内のどこからでも useToast() 経由で
  ここに通知を積める（loading/error/success等をalert()に頼らず汎用的に表示する仕組み）。
-->

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div v-for="t in toasts" :key="t.id" class="toast" :class="`toast-${t.type}`">
          <span class="toast-icon">{{ icon(t.type) }}</span>
          <span class="toast-message">{{ t.message }}</span>
          <button class="toast-close" aria-label="閉じる" @click="dismiss(t.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

function icon(type: ToastType): string {
  switch (type) {
    case 'success':
      return '✓'
    case 'error':
      return '⚠'
    case 'loading':
      return '⏳'
    default:
      return 'ℹ'
  }
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 1.25rem;
  right: 1.25rem;
  z-index: 2000;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 220px;
  max-width: 360px;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  font-size: 0.82rem;
  color: var(--color-text);
}

.toast-icon {
  flex-shrink: 0;
  font-size: 0.9rem;
}

.toast-message {
  flex: 1;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--color-text-faint);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.15rem;
}

.toast-close:hover {
  color: var(--color-text);
}

.toast-success {
  border-color: var(--color-accent);
}
.toast-success .toast-icon {
  color: var(--color-accent);
}

.toast-error {
  border-color: var(--color-danger-border);
}
.toast-error .toast-icon {
  color: var(--color-danger);
}

.toast-loading .toast-icon {
  color: var(--color-text-muted);
}

/* トランジション: 右からスライドイン、フェードアウト */
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
}
.toast-leave-active {
  position: absolute;
}
</style>
