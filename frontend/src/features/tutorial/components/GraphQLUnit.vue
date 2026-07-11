<!--
  ======================================================
  GraphQLUnit.vue — 単元: フロントエンドからGraphQLバックエンドを呼ぶ
  ======================================================
  ここで学ぶこと:
    - Vueコンポーネントから fetch 経由でGraphQLサーバー（backend/DicomLearning.GraphQL）を呼ぶ流れ
    - Query（読み取り）と Mutation（書き込み）の使い分け
    - 通信中/エラー/正常時の3状態をどうUIに出すか

  他の単元と違い、これは「本物のバックエンドサーバーが起動している」ことが前提のデモ。
  事前に `cd backend/DicomLearning.GraphQL && dotnet run` を実行しておく必要がある。
-->

<template>
  <TutorialUnitShell
    title="単元: フロントエンドからGraphQLバックエンドを呼ぶ"
    subtitle="backend/DicomLearning.GraphQL（C# / HotChocolate）に実際に接続するデモ"
  >
    <div class="demo-block">
      <p class="lead">
        事前に別ターミナルで
        <code>cd backend/DicomLearning.GraphQL && dotnet run</code>
        を実行してバックエンドを起動しておくこと。エンドポイントは
        <code>{{ endpoint }}</code>
        （
        <code>frontend/.env.development</code>
        の
        <code>VITE_GRAPHQL_ENDPOINT</code>
        で変更可能）。
      </p>

      <div class="control-row">
        <button :disabled="loading" @click="loadUnread">未読一覧を取得し直す（Query）</button>
      </div>

      <p v-if="loading" class="status-line">読み込み中…</p>
      <p v-if="errorMessage" class="status-line error">
        {{ errorMessage }}
        （バックエンドが起動していない、またはCORS設定が合っていない可能性があります）
      </p>

      <!-- ── 未読一覧 ── -->
      <section class="list-section">
        <h3>未読の画像（unreadInstances クエリ）</h3>
        <p v-if="!loading && unreadSops.length === 0" class="empty-line">
          未読の画像はありません（全部既読にした、または未取得）。
        </p>
        <ul class="sop-list">
          <li v-for="sop in unreadSops" :key="sop.sopInstanceUid" class="sop-row">
            <span class="sop-uid">{{ sop.sopInstanceUid }}</span>
            <span class="sop-path">{{ sop.filePath }}</span>
            <button :disabled="pendingUid === sop.sopInstanceUid" @click="handleMarkRead(sop)">
              既読にする（Mutation）
            </button>
          </li>
        </ul>
      </section>

      <!-- ── このデモで既読にした画像 ── -->
      <section v-if="recentlyRead.length > 0" class="list-section">
        <h3>このデモで既読にした画像</h3>
        <ul class="sop-list">
          <li v-for="sop in recentlyRead" :key="sop.sopInstanceUid" class="sop-row">
            <span class="sop-uid">{{ sop.sopInstanceUid }}</span>
            <span class="sop-path">{{ sop.readByUserId }} が既読化</span>
            <button :disabled="pendingUid === sop.sopInstanceUid" @click="handleMarkUnread(sop)">
              未読に戻す（Mutation）
            </button>
          </li>
        </ul>
      </section>
    </div>

    <template #analogy>
      <p>
        REST APIを「決まったメニューの定食屋」に例えるなら、GraphQLは「欲しい具材（フィールド）を
        自分で指定できるオーダーメイドの屋台」。このデモの
        <code>unreadInstances</code>
        クエリも、欲しいフィールド（sopInstanceUid, filePathなど）をこちらで指定して注文している。
      </p>
    </template>

    <template #react>
      <p>
        React + Apollo/urqlのようなGraphQLクライアントライブラリを使わず、素の
        <code>fetch</code>
        で呼んでいる点がポイント。ライブラリはキャッシュや再取得の自動化をしてくれるが、
        「結局中身は同じPOSTリクエスト」という基本形はここで掴める。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'
import { GRAPHQL_ENDPOINT } from '@/constants/env'
import {
  fetchUnreadInstances,
  markInstanceAsRead,
  markInstanceAsUnread,
  type GraphQLSop,
} from '@/services/backendApiService'

// デモ用の読影医ID（本来はログインユーザーの情報を使う。JWT認証導入後に置き換え予定）。
const DEMO_USER_ID = 'dr-tanaka'

const endpoint = GRAPHQL_ENDPOINT
const unreadSops = ref<GraphQLSop[]>([])
const recentlyRead = ref<GraphQLSop[]>([])
const loading = ref(false)
const errorMessage = ref('')
// 個別ボタンの二重クリック防止用（処理中のsopInstanceUidを覚えておく）
const pendingUid = ref<string | null>(null)

async function loadUnread() {
  loading.value = true
  errorMessage.value = ''
  try {
    unreadSops.value = await fetchUnreadInstances()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    loading.value = false
  }
}

async function handleMarkRead(sop: GraphQLSop) {
  pendingUid.value = sop.sopInstanceUid
  errorMessage.value = ''
  try {
    const updated = await markInstanceAsRead(sop.sopInstanceUid, DEMO_USER_ID)
    unreadSops.value = unreadSops.value.filter((s) => s.sopInstanceUid !== sop.sopInstanceUid)
    recentlyRead.value = [updated, ...recentlyRead.value]
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    pendingUid.value = null
  }
}

async function handleMarkUnread(sop: GraphQLSop) {
  pendingUid.value = sop.sopInstanceUid
  errorMessage.value = ''
  try {
    const updated = await markInstanceAsUnread(sop.sopInstanceUid)
    recentlyRead.value = recentlyRead.value.filter((s) => s.sopInstanceUid !== sop.sopInstanceUid)
    unreadSops.value = [updated, ...unreadSops.value]
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    pendingUid.value = null
  }
}

// 単元を開いたタイミングで最初の取得を自動実行する。
onMounted(loadUnread)
</script>

<style scoped>
.lead {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.control-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.control-row button,
.sop-row button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.82rem;
  white-space: nowrap;
}

.control-row button:hover,
.sop-row button:hover {
  background: var(--color-accent-bg-hover);
}

.control-row button:disabled,
.sop-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-line {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.status-line.error {
  color: var(--color-danger);
}

.list-section {
  margin-top: 1.25rem;
}

.list-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-heading);
}

.empty-line {
  font-size: 0.82rem;
  color: var(--color-text-faint);
}

.sop-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sop-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
}

.sop-uid {
  color: var(--color-accent);
  font-family: monospace;
  flex-shrink: 0;
}

.sop-path {
  color: var(--color-text-muted);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
