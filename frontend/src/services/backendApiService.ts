// ======================================================
// services/backendApiService.ts — backend/DicomLearning.GraphQL とのやり取り
// ======================================================
// dicomService.ts が dicom.ts というライブラリとの通信を担当する層であるのと同じように、
// このファイルは「backendのGraphQL APIとの通信」を担当する層、という位置づけになる。
// 実際にVueコンポーネントから呼ぶ例は features/tutorial/components/GraphQLUnit.vue を参照。
//
// 型（GraphQLSop等）は backend/DicomLearning.GraphQL/Models/UserSop.cs 等に対応する。

import { graphqlRequest } from './graphqlClient'

export interface GraphQLSop {
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
export async function fetchUnreadInstances(): Promise<GraphQLSop[]> {
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

  const data = await graphqlRequest<{ unreadInstances: GraphQLSop[] }>(query)
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
): Promise<GraphQLSop> {
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

  const data = await graphqlRequest<{ markInstanceAsRead: GraphQLSop }>(query, {
    sopInstanceUid,
    userId,
  })
  return data.markInstanceAsRead
}

// ======================================================
// markInstanceAsUnread — 画像を未読に戻す（Mutation の呼び方の例）
// ======================================================
export async function markInstanceAsUnread(sopInstanceUid: string): Promise<GraphQLSop> {
  const query = `
    mutation MarkInstanceAsUnread($sopInstanceUid: String!) {
      markInstanceAsUnread(sopInstanceUid: $sopInstanceUid) {
        sopInstanceUid
        isRead
      }
    }
  `

  const data = await graphqlRequest<{ markInstanceAsUnread: GraphQLSop }>(query, {
    sopInstanceUid,
  })
  return data.markInstanceAsUnread
}
