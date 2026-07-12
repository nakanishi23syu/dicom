# Banana Cake Pop（Nitro）の使い方

backend（`backend/DicomLearning.GraphQL`）が提供するGraphQL APIを、ブラウザから直接クエリ・ミューテーションを
試し打ちしながら動作確認するためのIDE（統合開発環境）の使い方をまとめる。

## 1. これは何か

**Banana Cake Pop** は ChilliCream 社（HotChocolateの開発元）が提供するGraphQL用IDE。
2024年に **Nitro** という名前にリブランドされ、現在HotChocolateのサーバーに標準で組み込まれているのは
このNitro（≒Banana Cake Popの後継）。`app.MapGraphQL()`（`Program.cs`参照）を呼ぶだけで、
追加のパッケージ・設定なしにブラウザからアクセスできる。

「Postmanのような画面で、REST APIの代わりにGraphQL APIを叩ける」とイメージすると分かりやすい。

## 2. 開き方

```bash
cd backend/DicomLearning.GraphQL
dotnet run
```

起動ログに表示されるポート番号（例: `http://localhost:5030`）を確認し、ブラウザで

```
http://localhost:5030/graphql
```

を開く。初回はNitroの画面が表示され、右上に「このサーバーに接続しますか」のような確認が出ることがあるので許可する。

## 3. 画面構成

| エリア | 役割 |
|---|---|
| 左ペイン | クエリ・ミューテーションを書くエディタ（GraphQL構文の入力補完が効く） |
| 右ペイン（Schema Reference / Docs） | スキーマ一覧。どんなQuery/Mutation/フィールドが呼べるか、型は何かを検索できる |
| 下部 Variables タブ | クエリ内の `$変数名` に渡す実際の値をJSONで書く |
| 下部 Headers タブ | HTTPヘッダーを追加できる。JWT認証が必要な操作はここに `Authorization` を設定する |
| 実行ボタン（▷ / Run） | 左ペインのクエリを実行し、結果が右下（Response）に表示される |

## 4. 基本的な使い方（クエリを実行してみる）

左ペインに以下を貼り付けて実行ボタンを押す。

```graphql
query {
  studies {
    studyInstanceUid
    patientName
    studyDate
    series {
      seriesDescription
      sops {
        sopInstanceUid
        isRead
      }
    }
  }
}
```

右下に検査一覧のJSONが返ってくれば疎通確認は成功。

### 変数（Variables）を使う場合

クエリ側は `$変数名: 型` の形で宣言し、実際の値は下部の Variables タブにJSONで書く。

クエリ:
```graphql
query PatientTimeline($patientId: String!) {
  patientTimeline(patientId: $patientId) {
    studyDate
    studyDescription
  }
}
```

Variables タブ:
```json
{
  "patientId": "patient-101"
}
```

## 5. ログインしてJWT認証つきの操作を試す

このプロジェクトの `[Authorize]` / `[Authorize(Roles = ["Admin"])]` が付いたフィールド
（並べ替え保存・チェック編集・削除など）は、ログインして取得したJWTトークンを
`Authorization` ヘッダーに付けないと実行できない。

### 手順

**① `login` ミューテーションを実行してトークンを取得する**

```graphql
mutation {
  login(username: "admin", password: "admin1234") {
    token
    displayName
    isAdmin
  }
}
```

実行すると `token` に長い文字列（JWT）が返ってくるので、それをコピーする。

**② Headers タブに `Authorization` を追加する**

下部の Headers タブを開き、以下のように設定する（`<コピーしたtoken>` を実際の値に置き換える）。

```json
{
  "Authorization": "Bearer <コピーしたtoken>"
}
```

これで以降、同じNitro画面内で実行するクエリ・ミューテーションすべてにこのヘッダーが付く。

**③ 認証が必要なミューテーションを実行する**

```graphql
mutation {
  reorderStudies(orderedStudyInstanceUids: ["1.2.xxx", "1.2.yyy"])
}
```

`Authorization` ヘッダーが無い、またはトークンの有効期限が切れている場合は
`"The current user is not authorized to access this resource."` というエラーが返る
（`extensions.code` が `AUTH_NOT_AUTHENTICATED`（未ログイン）か `AUTH_NOT_AUTHORIZED`（権限不足）かで区別できる）。

### 開発用アカウント

| ユーザー名 | パスワード | 権限 |
|---|---|---|
| `admin` | `admin1234` | 管理者（`reorderXxx`・`deleteXxx` 等が呼べる） |
| `dr-tanaka` | `doctor1234` | 一般（`[Authorize]` のみのフィールドまで） |

## 6. このプロジェクトでよく使うミューテーション例

トークン設定後、以下をそのまま試せる（UIDは実際にDBへ入っている値に置き換えること。
`studies` クエリで取得できる）。

```graphql
# 検査データの一部を編集する（DICOMタグとの整合性は問わない）
mutation {
  updateStudyFields(
    studyInstanceUid: "1.2.xxx"
    patientName: "テスト太郎"
  ) {
    studyInstanceUid
    patientName
  }
}

# 検査を削除する（DBレコード＋紐づくDICOMファイルもカスケード削除される。管理者のみ）
mutation {
  deleteStudy(studyInstanceUid: "1.2.xxx")
}
```

## 7. curlでも同じことができる

Nitroを使わず、コマンドラインから直接叩きたい場合は以下のように送る
（`Authorization` ヘッダーの付け方はNitroと同じ）。

```bash
# ログイン
curl -X POST http://localhost:5030/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(username: \"admin\", password: \"admin1234\") { token } }"}'

# 取得したtokenを使って認証つきの呼び出し
curl -X POST http://localhost:5030/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <取得したtoken>" \
  -d '{"query":"mutation { reorderStudies(orderedStudyInstanceUids: [\"1.2.xxx\"]) }"}'
```

## 8. 関連ドキュメント

- `backend/README.md` … スキーマの設計・GraphQLの基本概念・コードファースト方式の解説
- `環境構築手順書.md` … 環境構築全体の手順（Nitro/BananaCakePopの位置づけにも触れている）
