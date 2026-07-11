<!--
  ======================================================
  PropsEmitsUnit.vue — 単元3: Props & Emits（親子間の通信）
  ======================================================
  ここで学ぶこと:
    - Props: 親から子へデータを渡す
    - Emits: 子から親へ「イベント」を伝える（データは渡さない/渡してもよい）
    - 単方向データフロー（子は自分のPropsを直接書き換えない）
    - defineModel: 自作コンポーネントを v-model に対応させる糖衣構文
-->

<template>
  <TutorialUnitShell
    title="単元3: Props & Emits"
    subtitle="親から子へ渡す・子から親へ伝える。単方向データフローの基本"
  >
    <div class="demo-block">
      <h4>デモ1: いいねボタン（Props + Emits）</h4>
      <p class="lead">
        いいね数（likeCount）は親（このコンポーネント）が状態として持つ。
        子（PropsEmitsLikeButton）はクリックを検知したら 'like' を emit するだけで、
        実際に数値を増やす処理は親の handleLike が行う。
      </p>
      <PropsEmitsLikeButton :like-count="likeCount" :liked="liked" @like="handleLike" />
    </div>

    <div class="demo-block">
      <h4>デモ2: defineModel による v-model 対応の自作コンポーネント</h4>
      <p class="lead">
        親から見ると、自作コンポーネントでも
        <code>v-model="message"</code>
        と書くだけで双方向バインディングできる。
      </p>
      <PropsEmitsCustomInput v-model="message" />
      <p class="computed-line">親が持つ message の値: 「{{ message || '（空）' }}」</p>
    </div>

    <template #analogy>
      <p>
        Props は「親から子への一方通行の手紙」。 子は手紙の内容（Props）を読むことはできるが、
        手紙そのものを書き換えて親に送り返すことはできない
        （Propsを子の中で直接代入するとVueが警告を出す）。
      </p>
      <p>
        Emit は「子から親を呼ぶ内線電話」。 子は「こういうことが起きたよ」と親に電話をかけるだけで、
        実際にどう対応する（状態をどう変える）かは電話を受けた親が決める。
      </p>
    </template>

    <template #react>
      <p>
        Vueの Props は React の Props と概念的にはほぼ同じ。 親が
        <code>&lt;LikeButton likeCount={5} /&gt;</code>
        と書くのと
        <code>&lt;LikeButton :like-count="5" /&gt;</code>
        は対応する。
      </p>
      <p>
        Vueの Emit（
        <code>$emit('like')</code>
        ）は、 Reactでいう「コールバック関数をPropsとして渡す」パターンに対応する。
        Reactには専用の「イベント」の仕組みはなく、
        <code>&lt;LikeButton onLike={handleLike} /&gt;</code>
        のように普通の関数をPropsとして渡すのが定番。
      </p>
      <p>
        <code>defineModel</code>
        に完全に対応する構文はReactにはない。 Reactで同じ双方向バインディングをするには、
        <code>value</code>
        Propsと
        <code>onChange</code>
        コールバックの 2つを自分で用意し、親側で
        <code>&lt;CustomInput value={message} onChange={setMessage} /&gt;</code>
        のように明示的に配線する必要がある。Vueはこれを1つのマクロにまとめている。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import PropsEmitsLikeButton from './PropsEmitsLikeButton.vue'
import PropsEmitsCustomInput from './PropsEmitsCustomInput.vue'

// ── デモ1: いいねボタン ───────────────────────────────
// likeCount と liked は「親（このコンポーネント）」が持つ状態。
// 子コンポーネントはこれを Props として受け取るだけで、直接変更しない。
const likeCount = ref(12)
const liked = ref(false)

// 子から 'like' イベントを受け取ったときに呼ばれる。
// 実際に状態を変更するのはこの関数（親側の責任）。
function handleLike() {
  liked.value = !liked.value
  likeCount.value += liked.value ? 1 : -1
}

// ── デモ2: defineModel を使った自作コンポーネントの v-model ──
const message = ref('')
</script>

<style scoped>
.demo-block + .demo-block {
  margin-top: 1.5rem;
}

.demo-block h4 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: #8b9ab3;
}

.lead {
  font-size: 0.82rem;
  color: #566475;
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

.computed-line {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: #8b9ab3;
}
</style>
