<!--
  ======================================================
  CancelButton.vue — キャンセルボタン（BaseButtonのラッパー）
  ======================================================
  SaveButton.vue と対になるコンポーネント。
  variant="secondary" + 既定の文言「キャンセル」をあらかじめ設定している。

    <CancelButton @click="onCancel" />
    <CancelButton>閉じる</CancelButton>  ← 文言だけ変えたい場合
-->

<template>
  <BaseButton variant="secondary" :disabled="disabled" :full-width="fullWidth">
    <slot>キャンセル</slot>
  </BaseButton>
</template>

<script setup lang="ts">
import BaseButton from './BaseButton.vue'

withDefaults(
  defineProps<{
    disabled?: boolean
    fullWidth?: boolean
  }>(),
  {
    disabled: false,
    fullWidth: false,
  }
)
</script>
