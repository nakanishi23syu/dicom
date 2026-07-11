# DICOM Tool (フロントエンド)

Vue 3 + TypeScript 製の DICOM ビューアです。
[Orthanc](https://www.orthanc-server.com/) ライクなUIで、検査・シリーズ・画像を階層的に閲覧できます。

バックエンド（C# / HotChocolate GraphQL）は `../backend` を参照してください。
プロジェクト全体のセットアップ手順は [`../環境構築手順書.md`](../環境構築手順書.md) にまとめています。

## 機能

- **検査一覧テーブル** — `public/dicom/` 内の DICOM ファイルを読み込み、検査単位で一覧表示
- **シリーズ情報ポップアップ** — 検査行をクリックするとシリーズ一覧が表示
- **画像ビューア** — シリーズをダブルクリックするとピクセルデータを含む画像が一覧表示

## 技術スタック

| 役割 | ライブラリ |
|------|-----------|
| フレームワーク | Vue 3 (Composition API) |
| 言語 | TypeScript |
| ビルドツール | Vite |
| ルーティング | Vue Router 4 |
| 状態管理 | Pinia |
| DICOMパース・描画 | [dicom.ts](https://www.npmjs.com/package/dicom.ts) |

## セットアップ

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

## DICOMファイルの追加

1. `public/dicom/` に `.dcm` ファイルを配置する
2. `public/dicom/manifest.json` にファイル名を追記する

```json
{
  "files": [
    "sample1.dcm",
    "sample2.dcm"
  ]
}
```

### TCIAからのダウンロード

[The Cancer Imaging Archive](https://www.cancerimagingarchive.net/) からダウンロードした `.tcia` マニフェストファイルを使って、付属の Pythonスクリプトで自動ダウンロードできます。

```bash
cd frontend
pip install requests

# 最初の1シリーズのみ（動作確認用）
python download_dicom.py

# 任意のシリーズ数
python download_dicom.py --count 3

# 全シリーズ（大容量になる場合あり）
python download_dicom.py --all
```

スクリプトは DICOM ファイルを `public/dicom/` に保存し、`manifest.json` を自動更新します。

## プロジェクト構成

```
frontend/
├── public/
│   └── dicom/
│       ├── manifest.json        # 読み込む DCM ファイルのリスト
│       └── *.dcm                # DICOM ファイル
├── src/
│   ├── features/                # 機能単位のモジュール
│   │   ├── study/
│   │   │   └── components/
│   │   │       └── StudyTable.vue    # 検査一覧テーブル
│   │   ├── series/
│   │   │   └── components/
│   │   │       └── SeriesModal.vue   # シリーズ情報ポップアップ
│   │   └── viewer/
│   │       └── components/
│   │           └── ImageViewer.vue   # 画像ビューア
│   ├── router/
│   │   └── index.ts             # ルート定義（URL とページの対応）
│   ├── services/
│   │   └── dicomService.ts      # データ取得・変換（Vue に依存しない純粋関数）
│   ├── stores/
│   │   └── dicomStore.ts        # グローバル状態管理（Pinia）
│   ├── types/
│   │   └── dicom.ts             # 型定義（Study / Series / Instance）
│   ├── views/
│   │   └── StudyListView.vue    # 検査一覧ページ（"/" に対応）
│   ├── App.vue                  # ルートコンポーネント（RouterView のみ）
│   └── main.ts                  # エントリーポイント
├── download_dicom.py            # TCIA ダウンロードスクリプト
└── package.json
```

### アーキテクチャ概要

| 層 | ディレクトリ | 責務 |
|----|-------------|------|
| サービス層 | `services/` | fetch・parse・render の純粋関数。Vue に依存しないためテストが書きやすい |
| 状態管理層 | `stores/` | Pinia Store。studies / loading / error をグローバルに保持 |
| ルーティング層 | `router/` | URL とページコンポーネントの対応を管理 |
| ページ層 | `views/` | Store からデータを取り、feature コンポーネントを組み合わせる |
| 機能層 | `features/` | UI コンポーネント。Props / Emits のみで動作し、Store に依存しない |
| 型定義 | `types/` | アプリ全体で共有する TypeScript 型定義 |

## ビルド

```bash
npm run build
```

`dist/` に静的ファイルが出力されます。
