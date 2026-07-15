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
// 変更の保存（並べ替え + インライン編集の統合Mutation）
// ======================================================
// 以前は「並べ替え保存」（reorderXxx）と「インライン編集」（updateXxxFields）が
// 別々のMutationで、フロントエンドも「ドラッグ即保存」「ブラー即保存」の2系統だった。
// composables/useEditableList.ts が元データとの差分（変更された行だけ）を検出し、
// ここでは1つの保存ボタンからその差分をまとめて送るだけにする。
// 各フィールドはundefinedなら「変更しない」扱い（backend Mutation.cs参照）。
// orderが含まれる変更は管理者のみ許可される（backend側で判定・エラーを返す）。
export interface StudyChangeInput {
  studyInstanceUid: string
  order?: number
  patientId?: string
  patientName?: string
  // "YYYY-MM-DD"形式（HotChocolateがDateOnlyに割り当てるLocalDateスカラー）。
  studyDate?: string
  studyDescription?: string
  modality?: string
}

export async function saveStudyChanges(changes: StudyChangeInput[]): Promise<number> {
  const query = `
    mutation SaveStudyChanges($changes: [StudyChangeInput!]!) {
      saveStudyChanges(changes: $changes)
    }
  `
  const data = await graphqlRequest<{ saveStudyChanges: number }>(query, { changes })
  return data.saveStudyChanges
}

export interface SeriesChangeInput {
  seriesInstanceUid: string
  order?: number
  seriesNumber?: string
  seriesDescription?: string
  modality?: string
}

export async function saveSeriesChanges(changes: SeriesChangeInput[]): Promise<number> {
  const query = `
    mutation SaveSeriesChanges($changes: [SeriesChangeInput!]!) {
      saveSeriesChanges(changes: $changes)
    }
  `
  const data = await graphqlRequest<{ saveSeriesChanges: number }>(query, { changes })
  return data.saveSeriesChanges
}

export interface SopChangeInput {
  sopInstanceUid: string
  order?: number
  instanceNumber?: string
}

export async function saveSopChanges(changes: SopChangeInput[]): Promise<number> {
  const query = `
    mutation SaveSopChanges($changes: [SopChangeInput!]!) {
      saveSopChanges(changes: $changes)
    }
  `
  const data = await graphqlRequest<{ saveSopChanges: number }>(query, { changes })
  return data.saveSopChanges
}

// ======================================================
// DICOMタグへの復元（インライン編集で上書きした値を元のタグ値に戻す）
// ======================================================
// 「編集前の値」は別途保持していない。backend側で実ファイルを都度読み直して復元するため、
// 復元後の実際の値をレスポンスから受け取り、呼び出し側でローカルの表示データに反映する。
export interface RevertedStudyFields {
  studyInstanceUid: string
  patientId: string
  patientName: string
  studyDate: string
  studyDescription: string
  modality: string
  accessionNumber: string
  bodyPartExamined: string
}

export async function revertStudyFields(studyInstanceUid: string): Promise<RevertedStudyFields> {
  const query = `
    mutation RevertStudyFields($studyInstanceUid: String!) {
      revertStudyFields(studyInstanceUid: $studyInstanceUid) {
        studyInstanceUid
        patientId
        patientName
        studyDate
        studyDescription
        modality
        accessionNumber
        bodyPartExamined
      }
    }
  `
  const data = await graphqlRequest<{ revertStudyFields: RevertedStudyFields }>(query, {
    studyInstanceUid,
  })
  return data.revertStudyFields
}

export interface RevertedSeriesFields {
  seriesInstanceUid: string
  seriesNumber: string
  seriesDescription: string
  modality: string
}

export async function revertSeriesFields(seriesInstanceUid: string): Promise<RevertedSeriesFields> {
  const query = `
    mutation RevertSeriesFields($seriesInstanceUid: String!) {
      revertSeriesFields(seriesInstanceUid: $seriesInstanceUid) {
        seriesInstanceUid
        seriesNumber
        seriesDescription
        modality
      }
    }
  `
  const data = await graphqlRequest<{ revertSeriesFields: RevertedSeriesFields }>(query, {
    seriesInstanceUid,
  })
  return data.revertSeriesFields
}

export interface RevertedSopFields {
  sopInstanceUid: string
  instanceNumber: string
}

export async function revertSopFields(sopInstanceUid: string): Promise<RevertedSopFields> {
  const query = `
    mutation RevertSopFields($sopInstanceUid: String!) {
      revertSopFields(sopInstanceUid: $sopInstanceUid) {
        sopInstanceUid
        instanceNumber
      }
    }
  `
  const data = await graphqlRequest<{ revertSopFields: RevertedSopFields }>(query, {
    sopInstanceUid,
  })
  return data.revertSopFields
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
