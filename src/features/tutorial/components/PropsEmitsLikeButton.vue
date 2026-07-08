<!--
  ======================================================
  PropsEmitsLikeButton.vue — 単元3で使う子コンポーネント
  ======================================================
  親から「今のいいね数」を Props で受け取り、
  クリックされたら「いいねして」という意思表示だけを
  Emit で親に伝える。

  重要な点: このコンポーネント自身は likeCount を書き換えない。
  ボタンを押しても自分では数値を変えず、
  「増やしてほしい」というイベントを親に投げるだけ。
  実際に値を増やす（状態を持つ）のは親の責任。
  これが Vue の「単方向データフロー」の基本形。
-->

<template>
  <button class="like-btn" :class="{ liked: liked }" @click="$emit('like')">
    <span>{{ liked ? '❤️' : '🤍' }}</span>
    いいね {{ likeCount }}
  </button>
</template>

<script setup lang="ts">
// ======================================================
// defineProps — 親から受け取るデータ
// ======================================================
defineProps<{
  likeCount: number // 現在のいいね数（親が管理する状態）
  liked: boolean // 自分（このユーザー）が既にいいね済みか
}>()

// ======================================================
// defineEmits — 親に投げるイベント
// ======================================================
// 'like' イベントには引数を持たせない。
// 「クリックされた」という事実だけを伝え、
// 実際に likeCount をどう変えるかは親（PropsEmitsUnit.vue）が決める。
defineEmits<{
  like: []
}>()
</script>

<style scoped>
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #1e2d45;
  border: 1px solid #2a3f5f;
  color: #c8d6e5;
  border-radius: 20px;
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.like-btn:hover {
  background: #243550;
}

.like-btn.liked {
  border-color: #f87171;
  color: #f87171;
}
</style>
