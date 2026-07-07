// ======================================================
// services/dicomService.ts — DICOM データアクセス層
// ======================================================
// 【Service（サービス）層の役割】
// Vue（リアクティビティ・コンポーネント）に一切依存しない「純粋な関数」を置く場所。
// 責務は「外部との通信とデータの変換」だけ。
//   - fetch でファイルを取得する
//   - dicom.ts ライブラリでバイナリをパースする
//   - DICOM タグから Study / Series / Instance の構造に変換する
//
// この層を分離することで:
//   - ユニットテストが書きやすくなる（Vue の setup が不要）
//   - ロジックを複数の store / composable から再利用できる
//   - ライブラリ交換時の影響範囲をここだけに閉じ込められる

import dicomts from 'dicom.ts'
import type { DicomStudy, DicomSeries, DicomInstance } from '@/types/dicom'

// public/dicom/ のベースパス（Vite は public フォルダをルート "/" で配信する）
export const DICOM_BASE_PATH = '/dicom/'

// ======================================================
// fetchManifest — 読み込むファイル名一覧を取得する
// ======================================================
// manifest.json は「どの .dcm ファイルを読み込むか」を管理する設定ファイル。
// ブラウザからディレクトリ一覧は取得できないため、このファイルが必要になる。
export async function fetchManifest(): Promise<string[]> {
  const res = await fetch(`${DICOM_BASE_PATH}manifest.json`)
  if (!res.ok) throw new Error(`manifest.json の取得に失敗しました (HTTP ${res.status})`)
  const manifest: { files: string[] } = await res.json()
  return manifest.files
}

// ======================================================
// parseDicomFile — .dcm ファイルをパースして DCMImage を返す
// ======================================================
// fetch でバイナリを取得し、dicom.ts に渡してパースする。
// DCMImage は DICOM タグへのアクセスや canvas 描画に使うオブジェクト。
export async function parseDicomFile(filePath: string) {
  const res = await fetch(filePath)
  if (!res.ok) throw new Error(`ファイルの取得に失敗しました: ${filePath}`)
  const buffer = await res.arrayBuffer()
  return dicomts.parseImage(buffer) // パース失敗時は null を返す
}

// ======================================================
// renderDicomToCanvas — .dcm ファイルを <canvas> に描画する
// ======================================================
// ImageViewer から呼ばれる。dicom.ts の render は WebGL を使って高速に描画する。
export async function renderDicomToCanvas(
  filePath: string,
  canvas: HTMLCanvasElement,
  scale = 1,
): Promise<void> {
  const image = await parseDicomFile(filePath)
  if (!image) throw new Error('DICOMファイルのパースに失敗しました')
  await dicomts.render(image, canvas, scale)
}

// ======================================================
// loadAllStudies — manifest の全ファイルを解析して Study 構造に変換する
// ======================================================
// DICOM の1ファイル = 1インスタンス（画像1枚）。
// 複数ファイルを Study / Series / Instance の3階層にグルーピングして返す。
export async function loadAllStudies(): Promise<DicomStudy[]> {
  const files = await fetchManifest()
  if (files.length === 0) return []

  // Map<StudyUID, DicomStudy> でグルーピング。
  // 同じ Study UID を持つファイルが来たとき既存の Study に追記する。
  const studyMap = new Map<string, DicomStudy>()

  for (const fileName of files) {
    const filePath = `${DICOM_BASE_PATH}${fileName}`

    // パース失敗したファイルはスキップ（不正なファイルがあっても他に影響しない）
    const image = await parseDicomFile(filePath).catch(() => null)
    if (!image) continue

    // ── DICOM タグの読み取り ──────────────────────────────────
    // タグは [グループ番号, 要素番号] の16進数ペア。
    // dicom.ts の getTagValue() でタグの値を取得する（型は any なので as でキャスト）。

    const studyUID = (image.getTagValue([0x0020, 0x000d]) as string) ?? fileName // (0020,000D) Study Instance UID
    const studyDesc = (image.getTagValue([0x0008, 0x1030]) as string) ?? '' // (0008,1030) Study Description
    const accessionNum = (image.getTagValue([0x0008, 0x0050]) as string) ?? '' // (0008,0050) Accession Number
    const sopUID = (image.getTagValue([0x0008, 0x0018]) as string) ?? '' // (0008,0018) SOP Instance UID
    const instanceNum = (image.getTagValue([0x0020, 0x0013]) as string | number) ?? '' // (0020,0013) Instance Number
    const seriesUID = image.seriesInstanceUID ?? ''

    // ── Study の登録（初出の UID なら新規作成）──────────────────
    if (!studyMap.has(studyUID)) {
      studyMap.set(studyUID, {
        studyInstanceUID: studyUID,
        patientName: image.patientName ?? '',
        patientID: image.patientID ?? '',
        studyDate: image.studyDate ?? '',
        studyDescription: studyDesc,
        modality: image.modality ?? '',
        accessionNumber: accessionNum,
        series: [],
        filePath,
      })
    }

    const study = studyMap.get(studyUID)!

    // ── Series の登録（同じ seriesUID がなければ新規作成）──────────
    let series: DicomSeries | undefined = study.series.find(
      (s) => s.seriesInstanceUID === seriesUID,
    )
    if (!series) {
      series = {
        seriesInstanceUID: seriesUID,
        seriesNumber: String(image.seriesNumber ?? ''),
        seriesDescription: image.seriesDescription ?? '',
        modality: image.modality ?? '',
        numberOfInstances: 0,
        instances: [],
      }
      study.series.push(series)
    }

    // ── Instance（画像1枚）を Series に追加 ────────────────────
    const instance: DicomInstance = {
      sopInstanceUID: sopUID,
      instanceNumber: String(instanceNum),
      filePath,
    }
    series.instances.push(instance)
    series.numberOfInstances = series.instances.length
  }

  return Array.from(studyMap.values())
}
