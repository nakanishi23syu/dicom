# GraphQL 学習プロジェクト（C# / HotChocolate）

このディレクトリは、Vueアプリ本体（`../src`）とは**独立した**、GraphQLの仕組みを学ぶためのC#サンプルプロジェクトです。

- **まだVueアプリとは繋がっていません。** コードが読める・動かせる状態を目標にしています。
- 題材として、[`13_SYNAPSE_LEAD_関連用語集.md`](../13_SYNAPSE_LEAD_関連用語集.md)（富士フイルムのPACS製品「SYNAPSE LEAD」案件の参画準備用語集）にありそうな機能を仮実装しています。
  - 画像の**既読/未読フラグ**（メインの題材）
  - 患者ごとの**タイムラインビュー**（同一患者の過去検査を時系列で並べる、比較読影の土台になる機能）

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
cd graphql/DicomLearning.GraphQL
dotnet run
```

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
├── Program.cs              … アプリの起動処理。GraphQLサーバーの設定はここ
├── Models/                  … データの「形」（POCO）
│   ├── DicomStudy.cs        … 検査（Study）
│   ├── DicomSeries.cs       … シリーズ（Series）＋ 未読件数の計算プロパティ
│   └── DicomInstance.cs     … 画像1枚（Instance）＋ 既読/未読フラグ
├── Data/
│   ├── InMemoryDicomRepository.cs … 「DBの代わり」。メモリ上にデータを保持するダミーリポジトリ
│   └── SampleDataFactory.cs       … 仮データ（2人の患者・複数検査）を組み立てる
└── GraphQL/
    ├── Query.cs             … 読み取り操作（検索・一覧取得）
    └── Mutation.cs          … 書き込み操作（既読/未読の切り替え）
```

DICOMファイルの階層構造（Study > Series > Instance）は `src/types/dicom.ts` と同じ考え方です。
`Models/` 配下の3つのクラスはTypeScript側の対応する型と見比べてみると理解しやすいはずです。

## 4. コードファースト方式でのスキーマの作り方

HotChocolateには「スキーマファースト（`.graphql`ファイルを先に書く）」と
「コードファースト（C#のクラス・メソッドから自動生成する）」の2つの流儀がありますが、
このプロジェクトはコードファーストを採用しています。

`Query.cs` のメソッドがそのままGraphQLの「フィールド」になります:

```csharp
public class Query
{
    public IReadOnlyList<DicomStudy> GetStudies([Service] InMemoryDicomRepository repository) =>
        repository.GetStudies();
}
```

- メソッド名の先頭 `Get` は取り除かれ、camelCaseの `studies` というフィールド名としてスキーマに公開されます。
- `[Service]` 属性は「この引数はGraphQLのクエリ引数ではなく、ASP.NET CoreのDIコンテナから注入してね」という
  HotChocolateへの指示です。`Program.cs` で `AddSingleton<InMemoryDicomRepository>()` 済みのインスタンスが渡されます。
- 戻り値の型（`DicomStudy` の各プロパティ）から、GraphQLの型定義（スキーマ）が自動生成されます。
  C#側でプロパティを1つ足せば、スキーマにもそのままフィールドが増える、という関係です。

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
      instances {
        sopInstanceUid
        isRead
      }
    }
  }
}
```

### 患者のタイムライン（比較読影用）を取得する

`13_SYNAPSE_LEAD_関連用語集.md` の「タイムラインビュー」「比較読影」を意識した仮実装です。
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

## 6. このプロジェクトでは扱っていないこと（今後の学習の伸びしろ）

学習の焦点を絞るため、あえて次のような点は実装していません。実務のPACS開発ではいずれも重要な要素です。

- **永続化**: 実際のデータベース（SQL Server / PostgreSQL等）や `fo-dicom` によるDICOMファイルの実解析
- **認証・認可**: `13_SYNAPSE_LEAD_関連用語集.md` にある JWT認証・権限管理（管理者のみ削除可、等）
- **DataLoader / N+1問題対策**: 今回の `Query` は単純なリスト検索なので発生していませんが、
  例えば「検査一覧の各行で関連する読影レポートを都度取得する」ような設計にすると、
  1回のリクエストなのに裏でDBアクセスが大量発生する「N+1問題」が起きやすくなります。
  HotChocolateには `GreenDonut`（DataLoaderの実装）が同梱されているので、実際に手を広げる際はそちらを調べてください。
- **Subscription（リアルタイム更新）**: 「新しい画像が届いたら画面に即座に反映する」といった機能。
  `HotChocolate.AspNetCore` パッケージには Subscription 用の機能も含まれていますが、今回は未使用です。

## 7. フロントエンド側の対応: GraphQLの呼び方を学ぶ

このC#プロジェクトとVueアプリはまだ接続していませんが、「フロントエンドからGraphQL APIをどう呼ぶか」の
型だけは掴めるよう、`src/services/graphqlInstanceFlagService.ts` に fetch を使った仮実装を用意しています。
実際にこのC#サーバーを起動した状態でVue側から呼び出せば、そのまま繋がる想定のコードです。
