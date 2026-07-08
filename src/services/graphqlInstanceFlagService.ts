// ======================================================
// services/graphqlInstanceFlagService.ts — GraphQL API呼び出しの仮実装
// ======================================================
// 【このファイルの位置づけ】
// まだ store やコンポーネントからは一切呼ばれていない「仮実装（サンプル）」。
// graphql/ ディレクトリ（C# / HotChocolate製のGraphQL学習サーバー、graphql/README.md 参照）を
// Vue側からどう呼び出すか、その「型」だけを示すことが目的。
//
// dicomService.ts が dicom.ts というライブラリとの通信を担当する層であるのと同じように、
// このファイルは「GraphQLサーバーとの通信」を担当する層、という位置づけになる。
// 実際に store に組み込む場合も、コンポーネントが直接 fetch を書くのではなく、
// このような service 層に通信処理を閉じ込めるとよい。

// GraphQLサーバーのエンドポイント。
// graphql/DicomLearning.GraphQL を `dotnet run` で起動したときのURL（ポート番号はログを参照）。
const GRAPHQL_ENDPOINT = 'http://localhost:5030/graphql'

// GraphQLのレスポンスは常にこの形（{ data, errors }）で返ってくる。
// REST と違い、HTTPステータスが200でも `errors` にエラー内容が入っていることがある点に注意。
interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string }[]
}

// ======================================================
// graphqlRequest — GraphQLへの問い合わせをまとめる共通関数
// ======================================================
// 【GraphQLの呼び方の基本形】
// RESTのように「URLを変えて呼び分ける」のではなく、
// 常に同じエンドポイントへ POST し、body に
//   query     : 何を取得・実行したいか（GraphQLクエリ言語の文字列）
//   variables : クエリ中の $変数 に渡す実際の値
// を JSON で入れて送るだけ。
async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
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

// ======================================================
// 型定義（graphql/DicomLearning.GraphQL/Models/DicomInstance.cs に対応）
// ======================================================
export interface GraphQLDicomInstance {
  sopInstanceUid: string
  instanceNumber: string
  filePath: string
  isRead: boolean
  readAt: string | null
  readByUserId: string | null
}

// ======================================================
// fetchUnreadInstances — 未読の画像一覧を取得する（Query の呼び方の例）
// ======================================================
export async function fetchUnreadInstances(): Promise<GraphQLDicomInstance[]> {
  const query = `
    query UnreadInstances {
      unreadInstances {
        sopInstanceUid
        instanceNumber
        filePath
        isRead
        readAt
        readByUserId
      }
    }
  `

  const data = await graphqlRequest<{ unreadInstances: GraphQLDicomInstance[] }>(query)
  return data.unreadInstances
}

// ======================================================
// markInstanceAsRead — 画像を既読にする（Mutation の呼び方の例）
// ======================================================
// Query との違いは `mutation` キーワードで始める点だけで、
// 「変数を渡す・dataを受け取る」という基本の流れは同じ。
export async function markInstanceAsRead(
  sopInstanceUid: string,
  userId: string
): Promise<GraphQLDicomInstance> {
  const query = `
    mutation MarkInstanceAsRead($sopInstanceUid: String!, $userId: String!) {
      markInstanceAsRead(sopInstanceUid: $sopInstanceUid, userId: $userId) {
        sopInstanceUid
        isRead
        readAt
        readByUserId
      }
    }
  `

  const data = await graphqlRequest<{ markInstanceAsRead: GraphQLDicomInstance }>(query, {
    sopInstanceUid,
    userId,
  })
  return data.markInstanceAsRead
}

// ======================================================
// markInstanceAsUnread — 画像を未読に戻す（Mutation の呼び方の例）
// ======================================================
export async function markInstanceAsUnread(sopInstanceUid: string): Promise<GraphQLDicomInstance> {
  const query = `
    mutation MarkInstanceAsUnread($sopInstanceUid: String!) {
      markInstanceAsUnread(sopInstanceUid: $sopInstanceUid) {
        sopInstanceUid
        isRead
      }
    }
  `

  const data = await graphqlRequest<{ markInstanceAsUnread: GraphQLDicomInstance }>(query, {
    sopInstanceUid,
  })
  return data.markInstanceAsUnread
}
