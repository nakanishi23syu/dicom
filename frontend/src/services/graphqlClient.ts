// ======================================================
// services/graphqlClient.ts — GraphQLサーバーへの汎用リクエスト関数
// ======================================================
// 【GraphQLの呼び方の基本形】
// RESTのように「URLを変えて呼び分ける」のではなく、
// 常に同じエンドポイントへ POST し、body に
//   query     : 何を取得・実行したいか（GraphQLクエリ言語の文字列）
//   variables : クエリ中の $変数 に渡す実際の値
// を JSON で入れて送るだけ。
//
// backend/DicomLearning.GraphQL（C# / HotChocolate製、backend/README.md 参照）を
// 呼び出すための共通処理をここに1つだけ用意し、各serviceはこれを土台にする。

import { GRAPHQL_ENDPOINT } from '@/constants/env'
import { AUTH_TOKEN_STORAGE_KEY } from '@/constants/auth'

// GraphQLのレスポンスは常にこの形（{ data, errors }）で返ってくる。
// REST と違い、HTTPステータスが200でも `errors` にエラー内容が入っていることがある点に注意。
interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string; extensions?: { code?: string } }[]
}

// ======================================================
// GraphQLRequestError — GraphQLのerrors[]をラップしたエラー
// ======================================================
// HotChocolateは認証エラー・認可エラーのどちらも同じメッセージ文言
// （"The current user is not authorized to access this resource."）を返すため、
// メッセージだけでは「未ログイン」と「権限不足」を区別できない。
// 代わりに extensions.code（例: AUTH_NOT_AUTHENTICATED / AUTH_NOT_AUTHORIZED）を
// codes として保持しておき、呼び出し側で判定できるようにする。
export class GraphQLRequestError extends Error {
  constructor(
    message: string,
    public readonly codes: string[]
  ) {
    super(message)
    this.name = 'GraphQLRequestError'
  }
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  // ログイン済みならAuthorizationヘッダーにJWTを付ける。
  // このファイルはVueコンポーネントに依存しない層なので、Piniaストア(authStore)を
  // 参照する代わりに、ストアと同じlocalStorageキーを直接読む
  // （authStore.ts側もログイン/ログアウト時にこのキーを読み書きする）。
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`GraphQLサーバーへの通信に失敗しました (HTTP ${res.status})`)
  }

  const json: GraphQLResponse<T> = await res.json()

  // HTTP自体は成功していても、GraphQL側でエラーが起きていることがある
  // （例: 存在しないSOP Instance UIDを指定した等）。
  if (json.errors && json.errors.length > 0) {
    const message = json.errors.map((e) => e.message).join(', ')
    const codes = json.errors.map((e) => e.extensions?.code).filter((c): c is string => !!c)
    throw new GraphQLRequestError(message, codes)
  }

  if (json.data === undefined) {
    throw new Error('GraphQLのレスポンスにdataが含まれていません')
  }

  return json.data
}
