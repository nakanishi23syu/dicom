// ======================================================
// services/dicomService.ts — DICOM データアクセス層
// ======================================================
// 【Service（サービス）層の役割】
// Vue（リアクティビティ・コンポーネント）に一切依存しない「純粋な関数」を置く場所。
// 責務は「外部との通信とデータの変換」だけ。
//   - fetch でファイルを取得する
//   - dicom.ts ライブラリでバイナリをパースする
//   - GraphQLのレスポンス（backendApiService.ts）を画面用の型（types/dicom.ts）に変換する
//
// この層を分離することで:
//   - ユニットテストが書きやすくなる（Vue の setup が不要）
//   - ロジックを複数の store / composable から再利用できる
//   - ライブラリ交換時の影響範囲をここだけに閉じ込められる
//
// 検査一覧は以前 public/dicom/manifest.json をブラウザで直接パースする方式だったが、
// 指示書2.mdの要望（並べ替えのDB永続化・削除のカスケード反映等）に対応するため、
// backend GraphQL（backendApiService.ts）から取得する方式に切り替えた。

import dicomts from 'dicom.ts'
import { DICOM_FILE_BASE_URL } from '@/constants/env'
import type { GraphQLStudy, GraphQLSeries, GraphQLSop } from './backendApiService'
import type { DicomStudy, DicomSeries, DicomInstance } from '@/types/dicom'

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
  scale = 1
): Promise<void> {
  const image = await parseDicomFile(filePath)
  if (!image) throw new Error('DICOMファイルのパースに失敗しました')
  await dicomts.render(image, canvas, scale)
}

// ======================================================
// mapBackendStudy / mapBackendSeries / mapBackendSop
// ======================================================
// backendApiService.ts が返すGraphQLの型（フィールド名がcamelCaseのUid等）を、
// 画面側コンポーネントが期待する types/dicom.ts の型（DICOM由来の慣習でUID等）に変換する。
// ここで instance.filePath を「DicomRootからの相対パス」から「backendが配信する完全URL」に
// 変換しておくことで、SeriesListPanel.vue・ImageViewer.vue 等の描画コードは無修正で動く。
export function mapBackendStudy(study: GraphQLStudy): DicomStudy {
  const series = study.series.map(mapBackendSeries)
  return {
    studyInstanceUID: study.studyInstanceUid,
    patientName: study.patientName,
    patientID: study.patientId,
    // GraphQLのDateスカラーは "yyyy-MM-dd" で返るため、既存コード（formatDate等）が
    // 前提とする "yyyyMMdd" の8文字形式に合わせてハイフンを取り除く。
    studyDate: study.studyDate.split('-').join(''),
    studyDescription: study.studyDescription,
    modality: study.modality,
    accessionNumber: study.accessionNumber,
    series,
    filePath: series[0]?.instances[0]?.filePath ?? '',
    order: study.order,
  }
}

function mapBackendSeries(series: GraphQLSeries): DicomSeries {
  const instances = series.sops.map(mapBackendSop)
  return {
    seriesInstanceUID: series.seriesInstanceUid,
    seriesNumber: series.seriesNumber,
    seriesDescription: series.seriesDescription,
    modality: series.modality,
    numberOfInstances: instances.length,
    instances,
    order: series.order,
  }
}

function mapBackendSop(sop: GraphQLSop): DicomInstance {
  return {
    sopInstanceUID: sop.sopInstanceUid,
    instanceNumber: sop.instanceNumber,
    filePath: `${DICOM_FILE_BASE_URL}/${sop.filePath}`,
    order: sop.order,
  }
}
