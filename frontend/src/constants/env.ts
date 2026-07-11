// ======================================================
// constants/env.ts — .env の値をアプリ内で使う際の窓口
// ======================================================
// コンポーネントやserviceが `import.meta.env.VITE_XXX` を直接あちこちで書くと、
// 変数名のタイプミスやデフォルト値のばらつきが起きやすい。
// 「.envの値を読む場所」をこの1ファイルに集約し、他のコードはここ経由で参照する。

// バックエンド（backend/DicomLearning.GraphQL）のGraphQLエンドポイント。
// .env.development に開発時の既定値を用意しているが、念のためコード側にもフォールバックを持たせる。
export const GRAPHQL_ENDPOINT =
  import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:5030/graphql'
