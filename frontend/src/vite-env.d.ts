/// <reference types="vite/client" />

// ======================================================
// ImportMetaEnv拡張 — .envで定義した独自変数にTypeScriptの型を付ける
// ======================================================
// この宣言がないと `import.meta.env.VITE_GRAPHQL_ENDPOINT` が
// `any` 扱いになり、タイプミスに気づけない。
interface ImportMetaEnv {
  readonly VITE_GRAPHQL_ENDPOINT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
