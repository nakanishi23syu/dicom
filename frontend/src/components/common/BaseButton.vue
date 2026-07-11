<!--
  ======================================================
  BaseButton.vue — 汎用ボタン
  ======================================================
  アプリ内のあらゆるボタン（保存・キャンセル・OK等）の土台になるコンポーネント。
  SaveButton.vue / CancelButton.vue はこれを「見た目の初期値だけ変えて」ラップしたもの。

  【このコンポーネントの考え方】
  - 文言（ボタンに書く文字）は固定せず、slot（中身の差し込み口）で外から渡してもらう
    → <BaseButton>好きな文言</BaseButton> のように使う
  - クリック時の処理も固定せず、@click で外から登録してもらう
    → <BaseButton @click="好きな処理">保存</BaseButton>
  - こうしておくと「保存ボタンが欲しい」「キャンセルボタンが欲しい」という
    見た目違いのニーズに、コンポーネントを増やさず1つで対応できる。
-->

<template>
  <!--
    native の click イベントは特に何もしなくても親までそのまま伝わる
    （Vueは「Propsとして定義していないイベント/属性」を自動的にルート要素へ引き継ぐ）。
    そのため <BaseButton @click="foo"> と書くだけで foo が呼ばれる。
  -->
  <button
    type="button"
    class="base-button"
    :class="[`variant-${variant}`, { 'is-full-width': fullWidth }]"
    :disabled="disabled"
  >
    <!-- デフォルトスロット: ボタンの文言を外から差し込む -->
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    // 見た目のバリエーション。
    // primary   : 保存等、そのボタンを押すのが主な操作（アクセントカラー）
    // secondary : キャンセル等、控えめにしたい操作
    // danger    : 削除等、注意を促したい操作
    variant?: 'primary' | 'secondary' | 'danger'
    disabled?: boolean
    fullWidth?: boolean
  }>(),
  {
    variant: 'primary',
    disabled: false,
    fullWidth: false,
  }
)
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 6px;
  padding: 0.5rem 1.1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    background 0.15s,
    border-color 0.15s,
    opacity 0.15s;
}

.base-button.is-full-width {
  width: 100%;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* primary: 「保存」のような、そのポップアップ・フォームの主目的となる操作 */
.variant-primary {
  background: var(--color-accent-bg);
  border-color: var(--color-border-strong);
  color: var(--color-accent);
}

.variant-primary:not(:disabled):hover {
  background: var(--color-accent-bg-hover);
}

/* secondary: 「キャンセル」のような、控えめにしたい操作 */
.variant-secondary {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text-muted);
}

.variant-secondary:not(:disabled):hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

/* danger: 「削除」のような、注意を促したい操作 */
.variant-danger {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-border);
  color: var(--color-danger);
}

.variant-danger:not(:disabled):hover {
  opacity: 0.85;
}
</style>
