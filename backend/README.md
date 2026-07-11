# GraphQL 学習プロジェクト（C# / HotChocolate）

このディレクトリは、Vueアプリ本体（`../frontend`）とは**独立した**、GraphQLの仕組みを学ぶためのC#サンプルプロジェクトです。

- **まだVueアプリとは繋がっていません。** コードが読める・動かせる状態を目標にしています。
- 題材として、[`関連用語集.md`](../関連用語集.md)（富士フイルムのPACS製品「SYNAPSE LEAD」案件の参画準備用語集）にありそうな機能を仮実装しています。
  - 画像の**既読/未読フラグ**（メインの題材）
  - 患者ごとの**タイムラインビュー**（同一患者の過去検査を時系列で並べる、比較読影の土台になる機能）
- データは **Entity Framework Core + SQLite** で永続化しています（`dicom.db`。アプリ再起動してもデータは消えません）。

## 1. GraphQLとは何か（RESTとの違い）

REST APIは「URL（エンドポイント）ごとに返ってくるデータの形が決まっている」方式です。

```
GET /api/studies/123        → 検査の情報（全項目）が返ってくる
GET /api/studies/123/series → シリーズ一覧が返ってくる
```

画面によって必要な項目が違うと、`GET /api/studies/123?fields=patientName,studyDate` のような
専用パラメータや専用エンドポイントが増えがちです。DICOMのメタデータのように項目数が非常に多い場合、
これは無視できない問題になります（`13_SYNAPSE_LEAD_関連用語集.md` の「GraphQL」の項目を参照）。

GraphQLは逆に、**「1つのエンドポイント」＋「クライアントが欲しい形を自分で指定する」**方式です。

```graphql
# 患者名と検査日だけが欲しいとき
query { studies { patientName studyDate } }

# シリーズの情報まで欲しいとき（同じエンドポイントに同じクエリ言語で問い合わせるだけ）
query { studies { patientName studyDate series { seriesDescription unreadCount } } }
```

**たとえ話**: RESTは「あらかじめ決まったメニューしかない定食屋」、GraphQLは「好きな具材を指定して
1品作ってもらえるオーダーメイドの屋台」。屋台側（サーバー）は「どの具材（フィールド）を出せるか」という
メニュー表（スキーマ）だけを用意しておき、実際に何を注文するかは客（クライアント）が決める。

## 2. 動かし方

```bash
cd backend/DicomLearning.GraphQL
dotnet run
```

起動時に自動でSQLiteのマイグレーションが適用され（`dicom.db`が無ければ新規作成）、
テーブルが空ならサンプルデータが投入されます。

起動したら、ブラウザで `http://localhost:<ポート番号>/graphql` を開いてください
（ポート番号は起動時のログに表示されます。例: `http://localhost:5030/graphql`）。
**Nitro** というGraphQL用のIDE（クエリを試し打ちできる画面）が開き、右側のスキーマ一覧を見ながら
クエリを組み立てて実行できます。

curlで直接叩くこともできます:

```bash
curl -X POST http://localhost:5030/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { studies { patientName studyDate } }"}'
```

## 3. ディレクトリ構成

```
DicomLearning.GraphQL/
├── Program.cs              … アプリの起動処理。DbContext登録・マイグレーション適用・GraphQLサーバー設定
├── Models/                  … データの「形」（EF Coreエンティティ）
│   ├── UserStudy.cs         … 検査（テーブル: user_study）
│   ├── UserSeries.cs        … シリーズ（テーブル: user_series）＋ 未読件数の計算プロパティ
│   ├── UserSop.cs           … 画像1枚 / SOP Instance（テーブル: user_sop）＋ 既読/未読フラグ
│   ├── IOrderable.cs        … 並べ替え保存処理を3エンティティで共通化するためのインターフェース
│   └── AppUser.cs           … ログインユーザー（テーブル: app_user）。Username/PasswordHash/IsAdmin
├── Data/
│   ├── DicomDbContext.cs    … EF CoreのDbContext。テーブル名・index・リレーションの定義
│   └── DbSeeder.cs          … 開発用のサンプルデータ投入（テーブルが空の場合のみ）
├── Migrations/               … `dotnet ef migrations add` で生成されるスキーマ変更履歴
├── Configuration/
│   ├── DicomStorageOptions.cs … DICOMファイル保存先フォルダの設定（appsettings.jsonのStorageセクション）
│   └── JwtOptions.cs        … JWT発行・検証設定（appsettings.jsonのJwtセクション）
├── Services/
│   ├── DicomUploadService.cs … アップロードされたDICOMファイル1枚の解析・保存・DB登録
│   ├── DicomUploadResult.cs   … アップロード結果（成功/失敗）を表す型
│   └── AuthService.cs       … パスワードのハッシュ化/照合、JWT発行
└── GraphQL/
    ├── Query.cs             … 読み取り操作（検索・一覧取得）
    ├── Mutation.cs          … 書き込み操作（ログイン、既読/未読の切り替え、並べ替え保存）
    └── AuthPayload.cs       … loginミューテーションの戻り値（token/displayName/isAdmin）
```

## 3-2. DICOMアップロード機能

`POST /api/dicom-upload`（`multipart/form-data`、キー名 `files` で複数ファイル）にDICOMファイルを送ると、
[fo-dicom](https://github.com/fo-dicom/fo-dicom) でタグを解析し、

1. `Storage/dicom/{StudyInstanceUID}/{SeriesInstanceUID}/{SOPInstanceUID}.dcm` にファイル本体を保存
   （保存先は Vue側ではなくこのバックエンド側。フォルダは `appsettings.json` の `Storage:DicomRoot` で変更可能）
2. `user_study` / `user_series` / `user_sop` に該当行が無ければ作成（UIDで存在確認するupsert）

を行う。GraphQLではなく素のHTTP POSTにしているのは、バイナリファイルのアップロードは
GraphQLのmultipart request spec対応が別途必要になり、シンプルなREST APIの方が学習コストが低いため。

同じSOP Instance UIDのファイルは重複登録を避けるためスキップされる（`DicomUploadResult.success = false`
+ 理由がmessageに入って返る）。フロントエンドの実装は `frontend/src/services/uploadService.ts` と
`frontend/src/views/UploadView.vue` を参照。

DICOMファイルの階層構造（Study > Series > Instance）は `frontend/src/types/dicom.ts` と同じ考え方です。
`Models/` 配下の3つのクラスはTypeScript側の対応する型と見比べてみると理解しやすいはずです。

## 3-3. JWT認証・権限管理

`login` ミューテーションでユーザー名・パスワードを照合し、成功したらJWTを返す。
以降のリクエストは `Authorization: Bearer <token>` ヘッダーを付けて呼び出す。

```graphql
mutation {
  login(username: "admin", password: "admin1234") {
    token
    displayName
    isAdmin
  }
}
```

**開発用アカウント**（`DbSeeder.cs` で自動投入。パスワードは `AuthService.HashPassword` でハッシュ化して保存）:

| ユーザー名 | パスワード | 権限 |
|---|---|---|
| `admin` | `admin1234` | 管理者（`IsAdmin = true`） |
| `dr-tanaka` | `doctor1234` | 一般（`IsAdmin = false`） |

> ⚠️ これは学習用の固定パスワードです。本番相当の環境では絶対に使い回さないでください。

**認可のかけ方**（`GraphQL/Mutation.cs`）:

- `[Authorize]` … ログインしていれば誰でも呼べる（例: `markInstanceAsRead`/`markInstanceAsUnread`）
- `[Authorize(Roles = ["Admin"])]` … 管理者のみ呼べる（例: `reorderStudies`/`reorderSeries`/`reorderSops`。
  並べ替えは全員に見える表示順を変える操作のため管理者限定にしている。
  追加指示書の「管理者アカウントなら、できることが増える」に対応）

`[Authorize]` が付いていないフィールド（`studies`クエリ等）は未ログインでも呼び出せる。
JWTの署名鍵は `appsettings.Development.json` の `Jwt:SigningKey` にある開発用の値を使用しており、
本番では環境変数（`Jwt__SigningKey`）等で必ず別の値に差し替えること。

## 3-1. テーブル設計（user_study / user_series / user_sop）

DICOMファイルを毎回パースし直すのは負荷が高いため、一覧・検索・並べ替えでよく使う項目
（患者名・患者ID・検査日・部位等）をカラムとして外だししています。定義は `Data/DicomDbContext.cs` を参照。

| テーブル | 主な列 | index |
|---|---|---|
| `user_study` | `StudyInstanceUid`, `PatientId`, `PatientName`, `StudyDate`, `StudyDescription`, `Modality`, `AccessionNumber`, `BodyPartExamined`, `Order` | `StudyInstanceUid`(unique), `PatientId`, `StudyDate`, `PatientId+StudyDate`(複合, タイムライン用), `AccessionNumber`, `Order` |
| `user_series` | `SeriesInstanceUid`, `SeriesNumber`, `SeriesDescription`, `Modality`, `UserStudyId`(FK), `Order` | `SeriesInstanceUid`(unique), `UserStudyId`(FK, EF Core規約で自動付与), `Order` |
| `user_sop` | `SopInstanceUid`, `InstanceNumber`, `FilePath`, `IsRead`, `ReadAt`, `ReadByUserId`, `UserSeriesId`(FK), `Order` | `SopInstanceUid`(unique), `IsRead`(未読一覧の絞り込み用), `UserSeriesId`(FK, EF Core規約で自動付与), `Order` |

`Order` はNotion風のドラッグ&ドロップ並べ替え機能用の表示順（`Mutation.ReorderStudies`等で更新）。
詳細はセクション5の「並べ替え保存」の例、フロントエンド側は `frontend/src/composables/useDragSort.ts` を参照。

### マイグレーションの操作

```bash
# ツールが無ければ初回のみ
dotnet tool install --global dotnet-ef

cd backend/DicomLearning.GraphQL

# スキーマを変更した後、変更差分のMigrationファイルを追加する
dotnet ef migrations add <変更内容がわかる名前>

# DBに反映する（Program.csでも起動時に自動実行されるが、手動で反映したい場合）
dotnet ef database update
```

## 4. コードファースト方式でのスキーマの作り方

HotChocolateには「スキーマファースト（`.graphql`ファイルを先に書く）」と
「コードファースト（C#のクラス・メソッドから自動生成する）」の2つの流儀がありますが、
このプロジェクトはコードファーストを採用しています。

`Query.cs` のメソッドがそのままGraphQLの「フィールド」になります:

```csharp
public class Query
{
    public async Task<List<UserStudy>> GetStudiesAsync([Service] DicomDbContext db) =>
        await db.UserStudies.Include(s => s.Series).ThenInclude(se => se.Sops).ToListAsync();
}
```

- メソッド名の先頭 `Get` と末尾の `Async` は取り除かれ、camelCaseの `studies` というフィールド名としてスキーマに公開されます。
- `[Service]` 属性は「この引数はGraphQLのクエリ引数ではなく、ASP.NET CoreのDIコンテナから注入してね」という
  HotChocolateへの指示です。`Program.cs` で `AddDbContext<DicomDbContext>()` 済みのインスタンス（リクエストごとのScoped）が渡されます。
- 戻り値の型（`UserStudy` の各プロパティ）から、GraphQLの型定義（スキーマ）が自動生成されます。
  C#側でプロパティを1つ足せば、スキーマにもそのままフィールドが増える、という関係です。
- `Include`/`ThenInclude` で関連する`Series`/`Sops`を一括読み込みしています（DataLoaderは未導入。詳細はセクション6を参照）。

`Mutation.cs` も同様に「データを変更する操作」をメソッドとして定義したものです。
GraphQLの世界的な慣習として、読み取り専用の操作は `Query`、副作用のある操作は `Mutation` に分けます
（技術的にはQuery側に書き込み処理を書くこともできてしまいますが、
「このクエリは安全に何度呼んでも良い」という約束事を守るための慣習です）。

## 5. サンプルクエリ・ミューテーション集

### 検査一覧を取得する

```graphql
query {
  studies {
    studyInstanceUid
    patientName
    studyDate
    series {
      seriesDescription
      unreadCount
      sops {
        sopInstanceUid
        isRead
      }
    }
  }
}
```

### 患者のタイムライン（比較読影用）を取得する

`関連用語集.md` の「タイムラインビュー」「比較読影」を意識した仮実装です。
同一患者の過去検査を新しい順に並べて返します。

```graphql
query {
  patientTimeline(patientId: "patient-001") {
    studyDate
    studyDescription
  }
}
```

### 未読の画像だけを一覧する（読影ワークリスト的な使い方）

```graphql
query {
  unreadInstances {
    sopInstanceUid
    filePath
  }
}
```

### 画像を既読にする

```graphql
mutation {
  markInstanceAsRead(sopInstanceUid: "1.2.392.instance.1.1.1", userId: "dr-tanaka") {
    sopInstanceUid
    isRead
    readAt
    readByUserId
  }
}
```

### 画像を未読に戻す

```graphql
mutation {
  markInstanceAsUnread(sopInstanceUid: "1.2.392.instance.1.1.1") {
    sopInstanceUid
    isRead
  }
}
```

### 検査の並べ替えを保存する（Notion風ドラッグ&ドロップ）

ドラッグ&ドロップ後の新しい順番をUIDの配列で渡すと、`Order` 列に0始まりの連番で書き込まれる。
戻り値は実際に一致して更新できた件数（渡したUIDがDBに無ければカウントされない）。
シリーズ・SOPも `reorderSeries` / `reorderSops` で同様に呼び出せる（`Mutation.cs` の `ApplyReorderAsync` を共通利用）。

```graphql
mutation {
  reorderStudies(orderedStudyInstanceUids: ["1.2.392.study.2", "1.2.392.study.0", "1.2.392.study.1"])
}
```

## 6. このプロジェクトでは扱っていないこと（今後の学習の伸びしろ）

学習の焦点を絞るため、あえて次のような点は実装していません。実務のPACS開発ではいずれも重要な要素です。

- **DataLoader / N+1問題対策**: 今回の `Query` は `Include`/`ThenInclude` で一括読み込みしているため発生していませんが、
  例えば「検査一覧の各行で関連する読影レポートを都度取得する」ような設計にすると、
  1回のリクエストなのに裏でDBアクセスが大量発生する「N+1問題」が起きやすくなります。
  HotChocolateには `GreenDonut`（DataLoaderの実装）が同梱されているので、実際に手を広げる際はそちらを調べてください。
- **Subscription（リアルタイム更新）**: 「新しい画像が届いたら画面に即座に反映する」といった機能。
  `HotChocolate.AspNetCore` パッケージには Subscription 用の機能も含まれていますが、今回は未使用です。

## 7. フロントエンド側の対応: GraphQLの呼び方を学ぶ

このC#プロジェクトとVueアプリはまだ接続していませんが、「フロントエンドからGraphQL APIをどう呼ぶか」の
型だけは掴めるよう、`frontend/src/services/graphqlInstanceFlagService.ts` に fetch を使った仮実装を用意しています。
実際にこのC#サーバーを起動した状態でVue側から呼び出せば、そのまま繋がる想定のコードです。
