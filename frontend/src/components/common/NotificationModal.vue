<!--
  ======================================================
  NotificationModal.vue — 通知ポップアップ（モーダル）
  ======================================================
  「保存しました」「エラーが発生しました」等、ユーザーに一方的に伝えるだけの通知用モーダル。
  ボタンは「閉じる」の1つだけ。Yes/No選択が必要な場合は ConfirmDialog.vue を使う。

  【使い方】
    <NotificationModal v-model="showNotice" title="保存完了">
      検査情報を保存しました。
    </NotificationModal>

    ボタンの文言や閉じたときの処理を変えたい場合:
    <NotificationModal v-model="showNotice" title="保存完了" close-text="OK" @close="afterClose">
      検査情報を保存しました。
    </NotificationModal>
-->

<template>
  <BaseModal :model-value="modelValue" :title="title" @update:model-value="$emit('update:modelValue', $event)" @close="$emit('close')">
    <!-- 本文はデフォルトスロットで外から渡してもらう -->
    <slot />

    <template #footer>
      <BaseButton variant="primary" @click="$emit('update:modelValue', false)">
        {{ closeText }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    closeText?: string
  }>(),
  {
    title: '',
    closeText: '閉じる',
  }
)

defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()
</script>
