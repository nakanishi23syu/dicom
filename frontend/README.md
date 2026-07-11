# DICOM Tool (フロントエンド)

Vue 3 + TypeScript 製の DICOM ビューアです。
[Orthanc](https://www.orthanc-server.com/) ライクなUIで、検査・シリーズ・画像を階層的に閲覧できます。

バックエンド（C# / HotChocolate GraphQL）は `../backend` を参照してください。
プロジェクト全体のセットアップ手順は [`../環境構築手順書.md`](../環境構築手順書.md) にまとめています。

## 機能

実在するPACS製品「[SYNAPSE LEAD](https://www.fujifilm.com/jp/ja/healthcare/healthcare-it/it-imaging/synapse-lead)」の
画面キャプチャを参考に、ワークリスト（検査一覧）・タイムラインの構成を似せている（詳細は下記「実製品を参考にした画面構成」参照）。

- **検査一覧（ワークリスト）** — `public/dicom/` 内の DICOM ファイルを読み込み、検査単位で一覧表示。
  左サイドバー、読影ステータスバッジ付き
- **同一患者IDの全検査 / シリーズリスト**（インラインパネル） — 検査行を選択すると下に常設表示。
  シリーズを選択するとサムネイルを表示、ダブルクリックで画像ビューアを開く
- **画像ビューア** — シリーズをダブルクリックするとピクセルデータを含む画像が一覧表示
- **DICOMアップロード**（`/upload`） — ドラッグ&ドロップ（ファイル/フォルダ）・ファイル選択・フォルダ選択で
  DICOMファイルをbackendへ送信。解析・保存はすべてbackend側で行う（下記参照）
- **ログイン**（`/login`） — JWT認証。ログイン状態はヘッダーに表示され、管理者アカウントのみ
  並べ替え保存等の操作が可能になる（下記参照）
- **患者タイムライン**（`/timeline/:patientId`） — 検査一覧の「🕐 比較読影」リンクから、
  同一患者の過去検査を時系列で確認できる（下記参照）

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
│   ├── composables/
│   │   ├── useDragSort.ts        # Notion風ドラッグ&ドロップ並べ替えの共通ロジック（下記参照）
│   │   ├── useManualOrder.ts     # ドラッグ結果の手動並び順をlocalStorageへ保存・復元
│   │   ├── useFilterSort.ts      # Notion風フィルター・ソートの共通ロジック（下記参照）
│   │   └── useReadingStatus.ts   # 読影ステータス（未記入/記入中/一時保存/最終確定）の管理
│   ├── constants/
│   │   └── env.ts                # .env の値を読む窓口
│   ├── styles/
│   │   └── theme.css             # カラーテーマ用のCSS変数定義（.theme-light含む。下記参照）
│   ├── features/                # 機能単位のモジュール
│   │   ├── study/
│   │   │   └── components/
│   │   │       ├── StudyTable.vue          # 検査一覧テーブル
│   │   │       ├── WorklistSidebar.vue     # 左サイドバー（検索プリセット/分類フォルダ）
│   │   │       ├── ReadingStatusBadge.vue  # 読影ステータスの色付きバッジ
│   │   │       ├── PatientHistoryPanel.vue # 「同一患者IDの全検査」インラインパネル
│   │   │       └── SeriesListPanel.vue     # 「シリーズリスト」インラインパネル（サムネイル付き）
│   │   └── viewer/
│   │       └── components/
│   │           └── ImageViewer.vue   # 画像ビューア
│   ├── router/
│   │   └── index.ts             # ルート定義（URL とページの対応）
│   ├── services/
│   │   ├── dicomService.ts      # dicom.tsライブラリとの通信（Vue に依存しない純粋関数）
│   │   ├── graphqlClient.ts     # backend GraphQL への汎用リクエスト関数（JWT自動付与）
│   │   ├── backendApiService.ts # backend GraphQL の個別クエリ・ミューテーション
│   │   ├── authService.ts       # ログインAPIの呼び出し
│   │   ├── authErrorMessage.ts  # 認証/認可エラーを分かりやすい日本語に変換
│   │   ├── uploadService.ts     # backend への DICOM ファイルアップロード（REST）
│   │   └── fileDropService.ts   # ドラッグ&ドロップされたファイル/フォルダの再帰的な収集
│   ├── stores/
│   │   ├── dicomStore.ts        # グローバル状態管理（Pinia）
│   │   └── authStore.ts         # ログイン状態の管理（Pinia、localStorageと同期）
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

## Notion風ドラッグ&ドロップ並べ替え（`src/composables/useDragSort.ts`, `useManualOrder.ts`）

Notionのテーブルビューの操作感（列見出しクリックでソート、ソート未適用時は行をドラッグして
手動並べ替え）に合わせている。検査一覧（`StudyTable.vue`）で実際に動く形で実装済み。

- **ドラッグ&ドロップ**: 各行左端のハンドル（⠿）をドラッグすると順番を入れ替えられる
  （`useDragSort.ts`。ライブラリを使わずブラウザ標準の`draggable`属性 +
  dragstart/dragover/dropイベントだけで実装）。結果は`useManualOrder.ts`がlocalStorageに保存し、
  リロードしても順番が保持される
- **手動並べ替えとソートの関係**: 列ソートが有効な間は表示順がソート結果で決まるため、
  ドラッグでの手動並べ替えはできない（ハンドルが淡色表示になる）。これはNotion本体と同じ仕様

`useDragSort` は表示対象の型に依存しない汎用ロジックで、`Ref<T[]>` さえ渡せば
検査一覧以外（シリーズ一覧・SOP一覧等）にも使い回せる。backendへの永続化を伴う並べ替えの例は
`src/features/tutorial/components/DragSortUnit.vue`
（Vue学習チュートリアルの「Notion風ドラッグ&ドロップ並べ替え」単元、`reorderStudies`等のMutationを使用）
を参照。

## Notion風フィルター・ソート（`src/composables/useFilterSort.ts`）

検査一覧（`StudyTable.vue`）に、Notionのデータベースビューのようなフィルター・ソートUIを実装している。

- **フィルター**: 「+ フィルターを追加」から、項目・演算子（含む/含まない/と等しい/空である/空でない/
  以降/以前）・値の組み合わせを複数積み重ねられる（すべての条件を満たす行だけ表示＝AND）
- **ソート**: 列見出し（カラム名）をクリックすると、その列で昇順ソート → もう一度クリックで降順 →
  もう一度クリックでソート解除、の順に切り替わる（表計算ソフトでよくある操作方式）。
  一度に有効になるソート列は1つだけ

`useFilterSort` は表示対象の型に依存しない汎用ロジックで、値の取り出し方（`getFieldValue`）だけを
呼び出し側が渡す設計。検査一覧以外の一覧にも転用できる。

> 実装時のハマりどころ: `DicomStudy.studyDate` は型としては `string` だが、`dicom.ts` ライブラリの
> `image.studyDate` は実行時に `Date` オブジェクトを返すことがあった（型定義と実際の値の不一致）。
> これによりソート時に `.localeCompare is not a function` で例外が起きたため、
> `dicomService.ts` の `normalizeStudyDate()` でDICOMデータ取り込み時点で必ず文字列化するよう修正した。

## DICOMアップロード（`/upload`, `src/views/UploadView.vue`）

DICOM画像本体は Vue 側ではなく **backend側のストレージフォルダ** にのみ保存する方針（`backend/README.md` 参照）。
このページの役割はファイルを集めて `POST /api/dicom-upload` へ送るところまで。

ファイルの選び方は4通り用意している:

| 方法 | 実装 |
|---|---|
| ファイルのドラッグ&ドロップ | `dragover`/`drop` + `services/fileDropService.ts` |
| フォルダのドラッグ&ドロップ | 同上（`DataTransferItem.webkitGetAsEntry()` で再帰的にフォルダの中身を集める） |
| ファイル選択ボタン | `<input type="file" multiple>` |
| フォルダ選択ボタン | `<input type="file" webkitdirectory multiple>` |

`services/uploadService.ts` が `FormData` に複数ファイルを詰めて1回のPOSTでまとめて送り、
backend側はファイルごとの成功/失敗（同一SOP Instance UIDの重複はスキップ等）を返す。

## ログイン（`/login`, `src/stores/authStore.ts`）

backendの `login` ミューテーションでJWTを取得し、`authStore`（Pinia）とlocalStorageの両方に保存する。
以降、`services/graphqlClient.ts` が全リクエストへ自動的に `Authorization: Bearer <token>` ヘッダーを付ける
（localStorageを直接読む設計にしているのは、graphqlClient.tsがVue/Piniaに依存しないプレーンな
関数モジュールのため。詳しくはファイル内コメント参照）。

開発用アカウントは `backend/README.md` を参照（`admin`が管理者、`dr-tanaka`が一般）。
管理者のみ許可される操作（並べ替え保存等）を一般アカウント・未ログインで試すと、
`services/authErrorMessage.ts` が「ログインが必要です」「管理者アカウントが必要です」を
判別して表示する（backendの `extensions.code` が `AUTH_NOT_AUTHENTICATED` か
`AUTH_NOT_AUTHORIZED` かで判定している）。

> 実装時のハマりどころ: `components/common/BaseButton.vue` は既定で `type="button"` を
> 強制しており、`<form>` 内で送信ボタンとして使うと `@submit` が発火しなかった。
> `type` propを追加し、ログインフォームでは明示的に `type="submit"` を渡すよう修正した。

## 患者タイムライン（`/timeline/:patientId`, `src/views/TimelineView.vue`）

関連用語集.md にある「タイムラインビュー」「比較読影」の実装。検査一覧の各行にある
「🕐 比較読影」リンクから、その患者の過去検査をbackendの `patientTimeline` クエリで取得する。
SYNAPSE LEADの実際のタイムライン画面（モダリティごとの行×検査日を横に並べる構成）に合わせて、
モダリティ別の行の中に検査を古い順（左→右）に並べる横型グリッドで表示する。
選択中の検査と直前の検査をカードで並べ、比較読影を意識したレイアウトにしている。

backendにはまだ「保存済みDICOMファイルを画像として配信するAPI」（閲覧用の配信API）が無いため、
実製品のような画像サムネイルの代わりに、検査日と検査記述を表示するブロックにしている。

検査一覧（`StudyTable.vue`）は `public/dicom/manifest.json` を直接パースした表示データ、
タイムラインはbackend DBのデータという別経路のため、**まだbackendにアップロードしていない患者は
タイムラインが空になる**（アップロードすると同じ患者IDでbackendに登録されるため、そこで初めて繋がる）。
空の場合は `/upload` へのリンク付きで案内する。

## 実製品を参考にした画面構成（SYNAPSE LEAD）

検査一覧・タイムラインの画面構成は、実在するPACS製品
[SYNAPSE LEAD](https://www.fujifilm.com/jp/ja/healthcare/healthcare-it/it-imaging/synapse-lead)
の画面キャプチャを参考にしている。真似た主な点:

| 実製品の要素 | このプロジェクトでの対応 |
|---|---|
| 検査一覧は明るいテーマ、ビューア/タイムラインは暗いテーマ | `styles/theme.css` の `.theme-light` クラスをページのルート要素にだけ付けて、CSS変数の値をそのページ配下だけ上書きしている（コンポーネント側は`var(--color-xxx)`を参照するだけなので変更不要） |
| 左サイドバー「検索プリセット」「分類フォルダ」 | `WorklistSidebar.vue`（検索条件の保存・フォルダ振り分け機能自体は無いため、今のところ見た目の再現が中心） |
| 検査一覧の「読影ステータス」列（未記入/記入中/一時保存/最終確定） | `ReadingStatusBadge.vue` + `composables/useReadingStatus.ts`（レポート機能はスコープ外のため、状態はlocalStorageで簡易的に保持） |
| 検査選択時に下へ表示される「同一患者IDの全検査」 | `PatientHistoryPanel.vue`（検査一覧の中から同じ患者IDのものを絞り込むだけなので追加のAPI呼び出しは無し） |
| 検査選択時に下へ表示される「シリーズリスト」＋サムネイル | `SeriesListPanel.vue`（以前はポップアップモーダルだったが、実製品に合わせてインラインパネルに変更した） |
| タイムラインのモダリティ別・日付軸のレイアウト | `TimelineView.vue`（上記「患者タイムライン」参照） |

すべての画面が同じ配色である必要はない、という発想（画面の用途によってテーマを切り替える）は
Phase 3で作ったCSS変数によるテーマ機構（1箇所書き換えるだけで見た目が変わる設計）が
そのまま活きた例になっている。

## ビルド

```bash
npm run build
```

`dist/` に静的ファイルが出力されます。
