<!--
  ======================================================
  SaveButton.vue — 保存ボタン（BaseButtonのラッパー）
  ======================================================
  「保存ボタンが欲しい場所ではとりあえずこれを置けばよい」という
  一番よく使う組み合わせ（variant="primary" + 既定の文言「保存」）を
  あらかじめ用意したもの。

  文言を変えたい場合は slot で上書きできる:
    <SaveButton>この内容で保存する</SaveButton>
  クリック処理は BaseButton と同じく @click で登録する:
    <SaveButton @click="onSave" :disabled="isSaving" />
-->

<template>
  <BaseButton variant="primary" :disabled="disabled" :full-width="fullWidth">
    <!-- slotに何も渡されなかったときは既定の文言「保存」を表示する -->
    <slot>保存</slot>
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
