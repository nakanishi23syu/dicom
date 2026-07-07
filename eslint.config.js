import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
  // TypeScript推奨ルール
  ...tseslint.configs.recommended,

  // Vue推奨ルール (Vue3)
  ...pluginVue.configs['flat/recommended'],

  // .vue ファイルのパーサーに TypeScript を使う
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // プロジェクト固有のルール調整
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.vue'],
    rules: {
      // 未使用変数は型インポートを除いてエラー
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      // any は警告止まりにする（学習用途のため）
      '@typescript-eslint/no-explicit-any': 'warn',
      // コンポーネント名は複数単語でなくてもOK（小規模プロジェクト）
      'vue/multi-word-component-names': 'off',
      // テンプレート内の key は必須
      'vue/require-v-for-key': 'error',
      // props の定義順序を強制しない
      'vue/order-in-components': 'off',
    },
  },

  // Prettier との競合ルールをすべてオフ（必ず最後）
  eslintConfigPrettier,

  // チェック対象外
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', '*.config.js'],
  },
)
