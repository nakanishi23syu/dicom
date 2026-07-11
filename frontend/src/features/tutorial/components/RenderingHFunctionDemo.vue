<script lang="ts">
// ======================================================
// RenderingHFunctionDemo.vue — h()関数だけで書いたコンポーネント
// ======================================================
// このファイルには <template> が一切ない。
// 普段書いている <template>...</template> は、実はビルド時に
// この h() 呼び出しの塊（Render関数）へと自動変換されているだけ、というのを
// 「テンプレートを使わず直接書く」ことで体感してもらうためのサンプル。
//
// 【なぜ <script setup> ではなくこの書き方？】
// <script setup> は「テンプレートを書く」ことを前提にした糖衣構文で、
// setup() が自動生成される仕組みになっている。
// 素の setup() は「オブジェクトを返すとテンプレート用の変数として公開され」
// 「関数を返すとその関数自体がRender関数として使われる」という2通りの挙動を持つ。
// ここでは後者（関数を返す）を使い、Render関数を直接手で書いている。
import { defineComponent, h, ref } from 'vue'

// defineComponent() でラップすると、TypeScript（vue-tsc）が
// このコンポーネントの型情報を正しく解決できるようになる
// （素の export default だと他ファイルからimportしたときに型が失われる）。
export default defineComponent({
  setup() {
    const count = ref(0)

    // setup() が関数を返す → Vueはこれをそのまま「Render関数」として扱う。
    // h(タグ名, props, 子要素) が「1個のVNode（仮想DOMノード）」を作る関数。
    // テンプレートの <button @click="count++">+1</button> は、
    // コンパイル後は h('button', { onClick: ... }, '+1') とほぼ同じ形になる。
    return () =>
      h('div', { class: 'h-demo' }, [
        h('p', { class: 'h-demo-count' }, `count = ${count.value}`),
        h(
          'button',
          {
            class: 'h-demo-button',
            onClick: () => count.value++,
          },
          '+1'
        ),
      ])
  },
})
</script>

<style scoped>
.h-demo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.h-demo-count {
  font-size: 0.9rem;
  color: var(--color-text);
  min-width: 8ch;
}

.h-demo-button {
  background: var(--color-accent-bg);
  color: var(--color-accent);
  border: 1px solid var(--color-border-strong);
  border-radius: 5px;
  padding: 0.35rem 0.8rem;
  cursor: pointer;
}
</style>
