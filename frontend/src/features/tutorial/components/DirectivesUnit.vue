<!--
  ======================================================
  DirectivesUnit.vue — 単元2: 条件分岐とリスト表示
  ======================================================
  ここで学ぶこと:
    - v-if / v-else-if / v-else（条件によって要素ごと出し分ける）
    - v-show（表示/非表示だけ切り替える。要素はDOMに残り続ける）
    - v-if と v-show の使い分け
    - v-for + :key（配列からリストを描画する）
-->

<template>
  <TutorialUnitShell
    title="単元2: 条件分岐とリスト表示"
    subtitle="v-if / v-show / v-for の基本と使い分け"
  >
    <!-- ── デモ1: v-if vs v-show ─────────────────────────── -->
    <div class="demo-block">
      <h4>デモ1: ログイン状態の表示切り替え</h4>

      <button class="toggle-btn" @click="isLoggedIn = !isLoggedIn">
        {{ isLoggedIn ? 'ログアウトする' : 'ログインする' }}
      </button>

      <!--
        v-if: 条件が false の間、この要素は DOM から完全に取り除かれる。
        切り替えのたびに要素の生成・破棄コストがかかるが、
        非表示中はリソースを一切使わない。
      -->
      <p v-if="isLoggedIn" class="badge badge-on">🟢 ログイン中（v-if で描画）</p>
      <p v-else class="badge badge-off">⚪ 未ログイン（v-else で描画）</p>

      <!--
        v-show: 条件に関わらず要素は常にDOMに存在し続け、
        CSSの display:none が切り替わるだけ。
        頻繁に表示/非表示を切り替えるUI（タブ切り替え等）ではこちらが軽い。
      -->
      <p v-show="isLoggedIn" class="badge badge-show">
        👀 これは v-show の要素（DOMには常に存在し、CSSだけで隠れている）
      </p>
    </div>

    <!-- ── デモ2: v-for によるリスト表示 ──────────────────── -->
    <div class="demo-block">
      <h4>デモ2: ToDoリスト（v-for + :key）</h4>

      <form class="add-form" @submit.prevent="addTodo">
        <input v-model="newTodoText" placeholder="やることを入力" class="text-input" />
        <button type="submit">追加</button>
      </form>

      <!-- 0件のときは v-if でメッセージだけ表示（テーブルの空状態と同じパターン） -->
      <p v-if="todos.length === 0" class="empty-msg">まだ何もありません。</p>

      <ul v-else class="todo-list">
        <!--
          v-for="todo in todos" で配列を1件ずつループする。
          :key には配列のインデックスではなく一意なID（todo.id）を使う。
          →  Vue は :key を見て「どの要素が追加・削除・並び替えされたか」を判定するため、
             indexをkeyにすると、途中の要素を削除したときに
             他の行のDOM要素が使い回されてバグの原因になることがある。
        -->
        <li v-for="todo in todos" :key="todo.id" class="todo-item">
          <span :class="{ done: todo.done }" @click="todo.done = !todo.done">
            {{ todo.done ? '✅' : '⬜' }} {{ todo.text }}
          </span>
          <button class="remove-btn" @click="removeTodo(todo.id)">✕</button>
        </li>
      </ul>
    </div>

    <template #analogy>
      <p>
        <code>v-if</code>
        は「そもそも作らない・作ったら壊す」引っ越し業者。 条件が false
        なら家具（DOM要素）ごと運び出してしまう。
      </p>
      <p>
        <code>v-show</code>
        は「カーテンを閉めるだけ」の人。
        部屋（DOM要素）はそこにずっとあり続けるが、カーテン（CSS）で見えなくしているだけ。
        頻繁に開け閉めするなら、毎回引っ越すより カーテンの開け閉めの方が圧倒的に速い。
      </p>
      <p>
        <code>v-for</code>
        の
        <code>:key</code>
        は、名札のようなもの。 名札（一意なID）がないと、リストの並びが変わったときに
        「誰が誰だったか」を Vue が正しく判別できなくなる。
      </p>
    </template>

    <template #react>
      <p>
        <code>v-if</code>
        はJSXの条件付きレンダリングに対応する:
        <code>{'{isLoggedIn ? &lt;A/&gt; : &lt;B/&gt;}'}</code>
        や
        <code>{'{isLoggedIn && &lt;A/&gt;}'}</code>
        と同じ発想で、 条件がfalseの要素はReactのツリーからも消える。
      </p>
      <p>
        <code>v-show</code>
        に対応する標準構文はReactにはない。 同じことをするには自分で
        <code>style=&#123;&#123; display: isLoggedIn ? "block" : "none" &#125;&#125;</code>
        と書く必要がある。Vueはこれをディレクティブとして用意している。
      </p>
      <p>
        <code>v-for</code>
        は
        <code>todos.map(todo =&gt; &lt;li key={todo.id}&gt;...&lt;/li&gt;)</code>
        に対応する。
        <code>:key</code>
        の重要性（indexを避ける等）は Reactの
        <code>key</code>
        propとまったく同じ理由・同じ注意点。
      </p>
    </template>
  </TutorialUnitShell>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import TutorialUnitShell from './TutorialUnitShell.vue'

// ── デモ1: v-if / v-show の切り替えフラグ ──────────────────
const isLoggedIn = ref(false)

// ── デモ2: ToDoリスト ─────────────────────────────────────
interface Todo {
  id: number
  text: string
  done: boolean
}

// reactive() は ref() と違い、オブジェクト・配列をまるごとリアクティブにする。
// 配列の push/splice などの操作もそのまま追跡される。
const todos = reactive<Todo[]>([
  { id: 1, text: 'Vueのテンプレート構文を学ぶ', done: true },
  { id: 2, text: 'v-for の :key の重要性を理解する', done: false },
])

const newTodoText = ref('')
let nextId = 3 // デモ用の簡易ID採番（本来はUUID等を使う）

function addTodo() {
  const text = newTodoText.value.trim()
  if (!text) return
  todos.push({ id: nextId++, text, done: false })
  newTodoText.value = ''
}

function removeTodo(id: number) {
  const index = todos.findIndex((t) => t.id === id)
  if (index !== -1) todos.splice(index, 1)
}
</script>

<style scoped>
.demo-block + .demo-block {
  margin-top: 1.5rem;
}

.demo-block h4 {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.toggle-btn {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
  margin-bottom: 0.75rem;
}

.toggle-btn:hover {
  background: var(--color-accent-bg-hover);
}

.badge {
  font-size: 0.85rem;
  margin: 0.3rem 0;
}

.badge-on {
  color: var(--color-success);
}

.badge-off {
  color: var(--color-text-muted);
}

.badge-show {
  color: var(--color-warning);
}

.add-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.add-form button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
}

.text-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border-strong);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
}

.text-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.empty-msg {
  font-size: 0.85rem;
  color: var(--color-text-disabled);
}

.todo-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-accent-bg);
  border-radius: 5px;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.todo-item span {
  cursor: pointer;
}

.todo-item span.done {
  text-decoration: line-through;
  color: var(--color-text-disabled);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.9rem;
}

.remove-btn:hover {
  color: var(--color-danger);
}
</style>
