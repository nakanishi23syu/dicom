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
  order: number
}

export interface GraphQLSeries {
  seriesInstanceUid: string
  seriesNumber: string
  seriesDescription: string
  modality: string
  order: number
  sops: GraphQLSop[]
}

export interface GraphQLStudy {
  studyInstanceUid: string
  patientName: string
  patientId: string
  studyDate: string
  studyDescription: string
  modality: string
  accessionNumber: string
  bodyPartExamined: string
  order: number
  series: GraphQLSeries[]
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
        order
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

// ======================================================
// fetchStudies — 検査一覧（シリーズ・SOPまで含む階層）を取得する
// ======================================================
// orderフィールドも取得しておき、「並べ替え適用」ボタンでこの値を使って並べ替えられるようにする。
export async function fetchStudies(): Promise<GraphQLStudy[]> {
  const query = `
    query Studies {
      studies {
        studyInstanceUid
        patientName
        patientId
        studyDate
        studyDescription
        modality
        accessionNumber
        bodyPartExamined
        order
        series {
          seriesInstanceUid
          seriesNumber
          seriesDescription
          modality
          order
          sops {
            sopInstanceUid
            instanceNumber
            filePath
            isRead
            readAt
            readByUserId
            order
          }
        }
      }
    }
  `

  const data = await graphqlRequest<{ studies: GraphQLStudy[] }>(query)
  return data.studies
}

// ======================================================
// 並べ替え保存（Notion風ドラッグ&ドロップ並べ替え）
// ======================================================
// ドラッグ&ドロップで決めた新しい順番のUIDを配列で渡すと、backend側のOrderカラムに反映される。
// 戻り値は実際に更新できた件数（渡したUIDがDBに存在しない場合はカウントされない）。
export async function reorderStudies(orderedStudyInstanceUids: string[]): Promise<number> {
  const query = `
    mutation ReorderStudies($ids: [String!]!) {
      reorderStudies(orderedStudyInstanceUids: $ids)
    }
  `
  const data = await graphqlRequest<{ reorderStudies: number }>(query, {
    ids: orderedStudyInstanceUids,
  })
  return data.reorderStudies
}

export async function reorderSeries(orderedSeriesInstanceUids: string[]): Promise<number> {
  const query = `
    mutation ReorderSeries($ids: [String!]!) {
      reorderSeries(orderedSeriesInstanceUids: $ids)
    }
  `
  const data = await graphqlRequest<{ reorderSeries: number }>(query, {
    ids: orderedSeriesInstanceUids,
  })
  return data.reorderSeries
}

export async function reorderSops(orderedSopInstanceUids: string[]): Promise<number> {
  const query = `
    mutation ReorderSops($ids: [String!]!) {
      reorderSops(orderedSopInstanceUids: $ids)
    }
  `
  const data = await graphqlRequest<{ reorderSops: number }>(query, {
    ids: orderedSopInstanceUids,
  })
  return data.reorderSops
}

// ======================================================
// fetchPatientTimeline — 患者ごとの検査履歴を新しい順に取得する
// ======================================================
// 関連用語集.md にある「タイムラインビュー」（同一患者の過去検査を時系列で並べる、
// 比較読影の土台になる機能）に対応するクエリ。backend側は既に実装済み（Query.cs）。
export async function fetchPatientTimeline(patientId: string): Promise<GraphQLStudy[]> {
  const query = `
    query PatientTimeline($patientId: String!) {
      patientTimeline(patientId: $patientId) {
        studyInstanceUid
        patientName
        patientId
        studyDate
        studyDescription
        modality
        accessionNumber
        bodyPartExamined
        order
        series {
          seriesInstanceUid
          seriesNumber
          seriesDescription
          modality
          order
          sops {
            sopInstanceUid
            instanceNumber
            filePath
            isRead
            readAt
            readByUserId
            order
          }
        }
      }
    }
  `
  const data = await graphqlRequest<{ patientTimeline: GraphQLStudy[] }>(query, { patientId })
  return data.patientTimeline
}

// ======================================================
// インライン編集（Notion風チェック→編集）
// ======================================================
// 引数がundefinedの項目はbackend側で「変更しない」扱いになる（Mutation.cs参照）。
export interface StudyFieldsInput {
  patientId?: string
  patientName?: string
  // "YYYY-MM-DD"形式（HotChocolateがDateOnlyに割り当てるLocalDateスカラー）。
  // dicomService.mapBackendStudyの逆変換にあたる。
  studyDate?: string
  studyDescription?: string
  modality?: string
  accessionNumber?: string
  bodyPartExamined?: string
}

export async function updateStudyFields(
  studyInstanceUid: string,
  fields: StudyFieldsInput
): Promise<void> {
  const query = `
    mutation UpdateStudyFields(
      $studyInstanceUid: String!
      $patientId: String
      $patientName: String
      $studyDate: LocalDate
      $studyDescription: String
      $modality: String
      $accessionNumber: String
      $bodyPartExamined: String
    ) {
      updateStudyFields(
        studyInstanceUid: $studyInstanceUid
        patientId: $patientId
        patientName: $patientName
        studyDate: $studyDate
        studyDescription: $studyDescription
        modality: $modality
        accessionNumber: $accessionNumber
        bodyPartExamined: $bodyPartExamined
      ) {
        studyInstanceUid
      }
    }
  `
  await graphqlRequest<{ updateStudyFields: { studyInstanceUid: string } }>(query, {
    studyInstanceUid,
    ...fields,
  })
}

export interface SeriesFieldsInput {
  seriesNumber?: string
  seriesDescription?: string
  modality?: string
}

export async function updateSeriesFields(
  seriesInstanceUid: string,
  fields: SeriesFieldsInput
): Promise<void> {
  const query = `
    mutation UpdateSeriesFields(
      $seriesInstanceUid: String!
      $seriesNumber: String
      $seriesDescription: String
      $modality: String
    ) {
      updateSeriesFields(
        seriesInstanceUid: $seriesInstanceUid
        seriesNumber: $seriesNumber
        seriesDescription: $seriesDescription
        modality: $modality
      ) {
        seriesInstanceUid
      }
    }
  `
  await graphqlRequest<{ updateSeriesFields: { seriesInstanceUid: string } }>(query, {
    seriesInstanceUid,
    ...fields,
  })
}

export async function updateSopFields(
  sopInstanceUid: string,
  instanceNumber: string
): Promise<void> {
  const query = `
    mutation UpdateSopFields($sopInstanceUid: String!, $instanceNumber: String) {
      updateSopFields(sopInstanceUid: $sopInstanceUid, instanceNumber: $instanceNumber) {
        sopInstanceUid
      }
    }
  `
  await graphqlRequest<{ updateSopFields: { sopInstanceUid: string } }>(query, {
    sopInstanceUid,
    instanceNumber,
  })
}

// ======================================================
// カスケード削除（DBのレコード＋紐づくDICOMファイルを削除する）
// ======================================================
export async function deleteStudy(studyInstanceUid: string): Promise<void> {
  const query = `
    mutation DeleteStudy($studyInstanceUid: String!) {
      deleteStudy(studyInstanceUid: $studyInstanceUid)
    }
  `
  await graphqlRequest<{ deleteStudy: boolean }>(query, { studyInstanceUid })
}

export async function deleteSeries(seriesInstanceUid: string): Promise<void> {
  const query = `
    mutation DeleteSeries($seriesInstanceUid: String!) {
      deleteSeries(seriesInstanceUid: $seriesInstanceUid)
    }
  `
  await graphqlRequest<{ deleteSeries: boolean }>(query, { seriesInstanceUid })
}

export async function deleteSop(sopInstanceUid: string): Promise<void> {
  const query = `
    mutation DeleteSop($sopInstanceUid: String!) {
      deleteSop(sopInstanceUid: $sopInstanceUid)
    }
  `
  await graphqlRequest<{ deleteSop: boolean }>(query, { sopInstanceUid })
}
