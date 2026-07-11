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
│   ├── components/
│   │   └── common/               # どの画面からも使う汎用UI部品（下記参照）
│   ├── constants/
│   │   └── env.ts                # .env の値を読む窓口
│   ├── styles/
│   │   └── theme.css             # カラーテーマ用のCSS変数定義（下記参照）
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
│   │   ├── dicomService.ts      # dicom.tsライブラリとの通信（Vue に依存しない純粋関数）
│   │   ├── graphqlClient.ts     # backend GraphQL への汎用リクエスト関数
│   │   └── backendApiService.ts # backend GraphQL の個別クエリ・ミューテーション
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
| 機能層 | `features/` | 特定の機能に紐づくUIコンポーネント。Props / Emits のみで動作し、Store に依存しない |
| 汎用UI層 | `components/common/` | 特定の機能に紐づかない、どの画面からも使えるUI部品（下記参照） |
| 型定義 | `types/` | アプリ全体で共有する TypeScript 型定義 |

## 汎用UIコンポーネント（`src/components/common/`）

保存・キャンセル・通知・確認ダイアログなど、複数の画面で繰り返し使う部品はここに集約している。
文言は基本的にslot（コンポーネントの中身の差し込み口）で外から渡し、クリック時の処理は`@click`で登録する設計。

| コンポーネント | 用途 |
|---|---|
| `BaseButton.vue` | 汎用ボタン。`variant`(primary/secondary/danger)で見た目を切り替える |
| `SaveButton.vue` / `CancelButton.vue` | よく使う組み合わせ（保存・キャンセル）を既定値にしたBaseButtonのラッパー |
| `BaseModal.vue` | 汎用モーダル（Teleport + オーバーレイ + Escキー/オーバーレイクリックで閉じる） |
| `NotificationModal.vue` | 通知ポップアップ（ボタン1つの一方向な通知用） |
| `ConfirmDialog.vue` | yes/noポップアップ（`@confirm`/`@cancel`で選択結果を受け取る） |

使用例は `src/features/tutorial/components/CommonComponentsUnit.vue`
（Vue学習チュートリアルの「汎用UIコンポーネント」単元）で実際に動かしながら確認できる。

## カラーテーマ（`src/styles/theme.css`）

色は各コンポーネントに直接書かず、`theme.css` で定義した **CSS変数**（例: `--color-accent`）を
`var(--color-accent)` の形で参照する設計にしている。これにより、`theme.css` の値を書き換えるだけで
アプリ全体の見た目を一括で変更できる（BEM等の設計ルールを敷かなくても実現できる）。

新しい色を使いたくなったら、まず `theme.css` に該当する変数があるか確認し、無ければ追加してから使うこと。
各変数の意味は `theme.css` 内のコメントを参照（CSS初心者向けに詳しく解説している）。

## ビルド

```bash
npm run build
```

`dist/` に静的ファイルが出力されます。
