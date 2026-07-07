# Vue 学習リソース

## 公式・準公式リポジトリ

### [vuejs/core](https://github.com/vuejs/core)
Vue 3 本体のソースコード。`packages/vue/examples/` に公式サンプルが入っています。
上級者向けですが、実装の正解を知りたいときに役立ちます。

### [vuejs/create-vue](https://github.com/vuejs/create-vue)
`npm create vue@latest` の正体。`template-*` ディレクトリに TypeScript・Router・Pinia・Vitest 等の組み合わせテンプレートが入っており、**プロジェクト構成の公式の答え**がわかります。

### [vuejs/router](https://github.com/vuejs/router)
Vue Router 本体。`examples/` に各ルーティングパターンのサンプルがあります。

### [vuejs/pinia](https://github.com/vuejs/pinia)
Pinia 本体。`packages/pinia/src/` は Store の書き方を深く学ぶのに最適です。

---

## コミュニティで評価の高いリポジトリ

### [antfu/vitesse](https://github.com/antfu/vitesse)
Vue 作者チームの Anthony Fu 氏によるスターターテンプレート。
ファイルベースルーティング・自動インポートなど、モダンな構成のお手本になります。

### [vueuse/vueuse](https://github.com/vueuse/vueuse)
Composable（`useXxx`）の実装例が 100 個以上入っています。
**Composable の書き方**を学ぶのに最適です。

---

## 初学者向け

### [johnkomarnicki/vue-3-crash-course](https://github.com/johnkomarnicki/vue-3-crash-course)
YouTube のクラッシュコースに対応したシンプルなコード。
コンポーネント・Props・Emits・Composable を一通り網羅しています。

---

## おすすめの学習順

| 段階 | リポジトリ | 着目ポイント |
|------|-----------|-------------|
| 今すぐ | [vuejs/create-vue](https://github.com/vuejs/create-vue) | `template-*` ディレクトリのプロジェクト構成 |
| Composable を深める | [vueuse/vueuse](https://github.com/vueuse/vueuse) | `packages/core/` 以下の各 Composable |
| 構成のお手本 | [antfu/vitesse](https://github.com/antfu/vitesse) | `src/` 全体のディレクトリ構成 |
| Router の内部 | [vuejs/router](https://github.com/vuejs/router) | `examples/` のルーティングパターン |
| Pinia の内部 | [vuejs/pinia](https://github.com/vuejs/pinia) | `packages/pinia/src/store.ts` |
