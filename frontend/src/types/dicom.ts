// ======================================================
// types/dicom.ts — DICOM データの型定義
// ======================================================
// TypeScript の interface（インターフェース）は、
// オブジェクトの「形（プロパティ名と型）」を定義するもの。
// 実際のデータは持たず、型チェックだけに使われる。
//
// DICOM の階層構造:
//   Study（検査） > Series（シリーズ） > Instance（画像1枚）
//   例: CT検査 > 腹部軸位断 > 200枚のスライス

// ── 検査（Study）──────────────────────────────────────
// 1回の検査を表す。患者が病院で1度受けた撮影のまとまり。
export interface DicomStudy {
  studyInstanceUID: string // 検査を一意に識別するID（世界中で重複しない）
  patientName: string // 患者名（DICOM タグ: 0010,0010）
  patientID: string // 患者ID（DICOM タグ: 0010,0020）
  studyDate: string // 検査日（YYYYMMDD形式。例: "20240315"）
  studyDescription: string // 検査説明（例: "腹部CT"）
  modality: string // モダリティ（撮影装置の種類。例: CT, MR, CR）
  accessionNumber: string // アクセッション番号（RIS/HIS での管理番号）
  series: DicomSeries[] // この検査に含まれるシリーズの配列
  filePath: string // 代表ファイルのパス（検査レベルのサムネイル用）
  order: number // Notion風ドラッグ&ドロップ並べ替えの表示順（backendのUserStudy.Orderに対応）
}

// ── シリーズ（Series）─────────────────────────────────
// 1回の撮影条件のまとまり。1検査に複数のシリーズがある場合が多い。
// 例: CTなら「造影前」「造影後」が別シリーズになる。
export interface DicomSeries {
  seriesInstanceUID: string // シリーズを一意に識別するID
  seriesNumber: string // シリーズ番号（表示用の連番）
  seriesDescription: string // シリーズ説明（例: "PLAIN", "動脈相"）
  modality: string // モダリティ（シリーズ単位でも保持）
  numberOfInstances: number // このシリーズに含まれる画像の枚数
  instances: DicomInstance[] // 個々の画像（インスタンス）の配列
  order: number // Notion風ドラッグ&ドロップ並べ替えの表示順（backendのUserSeries.Orderに対応）
}

// ── インスタンス（Instance）───────────────────────────
// DICOM 画像1枚を表す。CT なら1スライス = 1インスタンス。
export interface DicomInstance {
  sopInstanceUID: string // 画像を一意に識別するID（SOP = Service-Object Pair）
  instanceNumber: string // 画像番号（シリーズ内での順番）
  filePath: string // ブラウザからアクセスできるファイルパス
  order: number // Notion風ドラッグ&ドロップ並べ替えの表示順（backendのUserSop.Orderに対応）
}
