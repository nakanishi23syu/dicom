<!--
  ======================================================
  ConfirmDialog.vue — yes / no ポップアップ
  ======================================================
  「本当に削除しますか？」のような、はい/いいえの二択を確認するモーダル。

  【使い方】
    <ConfirmDialog
      v-model="showConfirm"
      title="削除確認"
      @confirm="deleteStudy"
      @cancel="showConfirm = false"
    >
      この検査を削除します。よろしいですか？
    </ConfirmDialog>

  confirm/cancelボタンを押すと、それぞれ 'confirm' / 'cancel' イベントが発火し、
  同時にモーダルは閉じる（v-modelがfalseになる）。
  「はい」を押した後にモーダルを閉じたくない（例: 保存処理が終わるまで開いたままにしたい）場合は
  closeOnConfirm を false にして、@confirm 側で自分でv-modelを操作する。
-->

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <slot />

    <template #footer>
      <CancelButton @click="handleCancel">{{ cancelText }}</CancelButton>
      <SaveButton @click="handleConfirm">{{ confirmText }}</SaveButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import SaveButton from './SaveButton.vue'
import CancelButton from './CancelButton.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    confirmText?: string
    cancelText?: string
    // trueなら「はい」クリック時に自動でモーダルを閉じる（既定）。
    // falseの場合は呼び出し側が @confirm の中で明示的に閉じる必要がある
    // （例: 保存APIの結果を待ってから閉じたい場合）。
    closeOnConfirm?: boolean
  }>(),
  {
    title: '',
    confirmText: 'はい',
    cancelText: 'いいえ',
    closeOnConfirm: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

function handleConfirm() {
  emit('confirm')
  if (props.closeOnConfirm) {
    emit('update:modelValue', false)
  }
}

function handleCancel() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>
