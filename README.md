# dicom-tool

DICOM（医用画像）を検査・シリーズ・画像単位で閲覧できる学習用ツールです。
Vue 3 のフロントエンドと、C# / GraphQL のバックエンドで構成するモノレポです。

## 構成

```
dicom-tool/
├── frontend/              … Vue 3 + TypeScript 製のビューアUI（詳細: frontend/README.md）
├── backend/                … C# / HotChocolate 製の GraphQL API（詳細: backend/README.md）
├── 環境構築手順書.md         … 開発環境のセットアップ手順（他プロジェクトの環境構築にも流用可能）
├── 関連用語集.md             … PACS/DICOM関連の用語集（SYNAPSE LEAD案件の参画準備用）
└── 追加指示書.md             … 今後の機能追加の指示書
```

- フロントエンドとバックエンドは現時点では**まだ接続されていません**（それぞれ独立して動作確認できます）。
- Claude Code の設定（`.claude/` 等）やドキュメント類はこのルート（親フォルダ）にまとめて配置しています。

## クイックスタート

```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド（別ターミナル）
cd backend/DicomLearning.GraphQL
dotnet run
```

詳しいセットアップ手順は [`環境構築手順書.md`](./環境構築手順書.md) を参照してください。
