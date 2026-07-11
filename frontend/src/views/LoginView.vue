<!--
  ======================================================
  views/LoginView.vue — ログインページ
  ======================================================
  backend/DicomLearning.GraphQL の login ミューテーションでJWTを取得し、
  stores/authStore.ts に保存する。ログイン後は「並べ替え保存」等の
  認証必須の操作がgraphqlClient.ts経由で自動的にAuthorizationヘッダー付きで呼べるようになる。
-->

<template>
  <div class="page">
    <div class="login-card">
      <RouterLink :to="{ name: 'study-list' }" class="back-link">← 検査一覧に戻る</RouterLink>
      <h1>ログイン</h1>
      <p class="page-desc">
        開発用アカウント: <code>admin / admin1234</code>（管理者）、
        <code>dr-tanaka / doctor1234</code>（一般）
      </p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>ユーザー名</span>
          <input v-model="username" type="text" autocomplete="username" required />
        </label>
        <label class="field">
          <span>パスワード</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <p v-if="store.error" class="error-msg">{{ store.error }}</p>

        <SaveButton type="submit" :disabled="store.loading" full-width>
          {{ store.loading ? 'ログイン中…' : 'ログイン' }}
        </SaveButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import SaveButton from '@/components/common/SaveButton.vue'
import { useAuthStore } from '@/stores/authStore'

const router = useRouter()
const store = useAuthStore()

const username = ref('')
const password = ref('')

async function handleSubmit() {
  try {
    await store.login(username.value, password.value)
    router.push({ name: 'study-list' })
  } catch {
    // エラーメッセージは store.error 経由でテンプレートに表示済みなのでここでは何もしない
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  width: 360px;
  max-width: 100%;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.5rem;
}

.back-link {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--color-accent);
  text-decoration: none;
  margin-bottom: 0.75rem;
}

.back-link:hover {
  text-decoration: underline;
}

.login-card h1 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--color-text-heading);
}

.page-desc {
  margin: 0 0 1.25rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.page-desc code {
  background: var(--color-bg);
  padding: 1px 4px;
  border-radius: 3px;
  color: var(--color-accent);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.field input {
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border-strong);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  font-size: 0.88rem;
}

.field input:focus {
  outline: 1px solid var(--color-accent);
}

.error-msg {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-danger);
}
</style>
