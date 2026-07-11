<!--
  ======================================================
  CommonComponentsUnit.vue — 単元: 汎用UIコンポーネント
  ======================================================
  ここで学ぶこと:
    - components/common/ に置いた「どの画面でも使える部品」の使い方
    - slotで文言を外から差し込む・@clickでイベントを登録する、という設計の実例
    - v-model でモーダルの開閉状態を親から制御する方法
-->

<template>
  <TutorialUnitShell
    title="単元: 汎用UIコンポーネント"
    subtitle="components/common/ 配下の BaseButton・BaseModal・ConfirmDialog・NotificationModal"
  >
    <div class="demo-block">
      <h3>ボタン（BaseButton / SaveButton / CancelButton）</h3>
      <p class="lead">
        文言はslot、クリック時の処理は@clickで外から渡す。
        <code>SaveButton</code>
        ・
        <code>CancelButton</code>
        は「よく使う組み合わせ」を既定値にしたラッパー。
      </p>
      <div class="control-row">
        <BaseButton variant="primary" @click="log('primaryボタンがクリックされた')">
          primary（既定文言なし）
        </BaseButton>
        <BaseButton variant="secondary" @click="log('secondaryボタンがクリックされた')">
          secondary
        </BaseButton>
        <BaseButton variant="danger" @click="log('dangerボタンがクリックされた')">
          danger
        </BaseButton>
        <SaveButton @click="log('SaveButton: 既定文言「保存」')" />
        <CancelButton @click="log('CancelButton: 既定文言「キャンセル」')" />
        <SaveButton @click="log('文言を上書きしたSaveButton')">この内容で確定</SaveButton>
      </div>

      <h3>通知ポップアップ（NotificationModal）</h3>
      <p class="lead">はい/いいえの選択肢がなく、内容を伝えるだけの1ボタンモーダル。</p>
      <div class="control-row">
        <BaseButton variant="primary" @click="showNotification = true">通知を表示する</BaseButton>
      </div>

      <h3>yes / no ポップアップ（ConfirmDialog）</h3>
      <p class="lead">「はい」「いいえ」の二択。押した結果を @confirm / @cancel で受け取る。</p>
      <div class="control-row">
        <BaseButton variant="danger" @click="showConfirm = true">この検査を削除する</BaseButton>
      </div>

      <p v-if="logMessages.length > 0" class="log-title">操作ログ</p>
      <ul class="log-list">
        <li v-for="(msg, i) in logMessages" :key="i">{{ msg }}</li>
      </ul>
    </div>

    <template #analogy>
      <p>
        BaseButton・BaseModalは「白紙のテンプレート」、SaveButton・NotificationModalは
        「テンプレートに既定の文言をあらかじめ印字した専用フォーム」。
        中身（文言・処理）を差し替えられる余地は残したまま、毎回ゼロから書く手間を省いている。
      </p>
    </template>

    <template #react>
      <p>
        <code>&lt;slot /&gt;</code>
        はReactでいう
        <code>props.children</code>
        に相当する。名前付きスロット（
        <code>&lt;template #footer&gt;</code>
        ）は、Reactだと
        <code>footer</code>
        という名前のpropsに直接JSXを渡す（
        <code>&lt;Modal footer={&lt;button&gt;OK&lt;/button&gt;} /&gt;</code>
        ）のとほぼ同じ役割。
      </p>
    </template>
  </TutorialUnitShell>

  <!-- 通知ポップアップ本体。v-modelで表示状態を管理する。 -->
  <NotificationModal v-model="showNotification" title="保存完了">
    デモ用の通知です。実際の画面では「保存しました」等のメッセージをここに表示する。
  </NotificationModal>

  <!-- yes/noポップアップ本体 -->
  <ConfirmDialog
    v-model="showConfirm"
    title="削除確認"
    confirm-text="削除する"
    cancel-text="キャンセル"
    @confirm="log('ConfirmDialog: 「削除する」が選択された')"
    @cancel="log('ConfirmDialog: 「キャンセル」が選択された')"
  >
    この検査を削除します。この操作は取り消せません。よろしいですか？
  </ConfirmDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import SaveButton from '@/components/common/SaveButton.vue'
import CancelButton from '@/components/common/CancelButton.vue'
import NotificationModal from '@/components/common/NotificationModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const showNotification = ref(false)
const showConfirm = ref(false)
const logMessages = ref<string[]>([])

function log(message: string) {
  logMessages.value = [message, ...logMessages.value].slice(0, 5)
}
</script>

<style scoped>
.demo-block h3 {
  margin: 1.25rem 0 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-heading);
}

.demo-block h3:first-child {
  margin-top: 0;
}

.lead {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 0.75rem;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.log-title {
  margin: 1.25rem 0 0.4rem;
  font-size: 0.78rem;
  color: var(--color-text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.log-list li {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 5px;
  padding: 0.4rem 0.6rem;
  font-size: 0.78rem;
  color: var(--color-text);
}
</style>
