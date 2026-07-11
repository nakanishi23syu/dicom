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

// GraphQLのレスポンスは常にこの形（{ data, errors }）で返ってくる。
// REST と違い、HTTPステータスが200でも `errors` にエラー内容が入っていることがある点に注意。
interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string }[]
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`GraphQLサーバーへの通信に失敗しました (HTTP ${res.status})`)
  }

  const json: GraphQLResponse<T> = await res.json()

  // HTTP自体は成功していても、GraphQL側でエラーが起きていることがある
  // （例: 存在しないSOP Instance UIDを指定した等）。
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e) => e.message).join(', '))
  }

  if (json.data === undefined) {
    throw new Error('GraphQLのレスポンスにdataが含まれていません')
  }

  return json.data
}
