// ======================================================
// services/uploadService.ts — backend へのDICOMファイルアップロード
// ======================================================
// GraphQLではなく、素の multipart/form-data POST を使う（graphqlClient.tsとは別経路）。
// GraphQL経由でもファイルアップロードは不可能ではないが（multipart request spec対応が別途必要）、
// バイナリファイルを送るだけなら通常のHTTP POSTの方がシンプルで、backend側もREST APIとして
// 素直に実装できるため、この機能だけ意図的にGraphQLの外に出している。
// 対応する backend 側の実装は backend/DicomLearning.GraphQL/Program.cs の
// `app.MapPost("/api/dicom-upload", ...)` を参照。

import { DICOM_UPLOAD_ENDPOINT } from '@/constants/env'

export interface DicomUploadResult {
  fileName: string
  success: boolean
  studyInstanceUid: string | null
  seriesInstanceUid: string | null
  sopInstanceUid: string | null
  message: string
}

// ======================================================
// uploadDicomFiles — 複数ファイルを1回のリクエストでまとめて送る
// ======================================================
// FormData に同じキー名("files")で複数回appendすると、backend側では
// 「filesという名前のファイル配列」として1つのフォームで受け取れる
// （IFormRequest#Files経由。backendはこれを1件ずつ処理する）。
export async function uploadDicomFiles(files: File[]): Promise<DicomUploadResult[]> {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  const res = await fetch(DICOM_UPLOAD_ENDPOINT, {
    method: 'POST',
    body: formData,
    // Content-Type は指定しない。fetchがFormDataを渡されると、
    // 境界文字列(boundary)を含む正しい `multipart/form-data; boundary=...` を自動設定してくれる。
    // 手動でヘッダーを付けるとboundaryが欠落してbackend側でパースに失敗する。
  })

  if (!res.ok) {
    throw new Error(`アップロードに失敗しました (HTTP ${res.status})`)
  }

  return (await res.json()) as DicomUploadResult[]
}
