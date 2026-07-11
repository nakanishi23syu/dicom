using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.GraphQL;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// DIコンテナへの登録
// ======================================================
// InMemoryDicomRepository は「アプリが起動している間ずっと状態を保持するダミーDB」。
// Singletonで登録することで、どのリクエストからも同じインスタンス（同じデータ）を参照できる。
// 本番運用ではここが「DbContextをScopedで登録する」等に置き換わる部分。
builder.Services.AddSingleton<InMemoryDicomRepository>();

// ======================================================
// GraphQLサーバーの設定
// ======================================================
// AddGraphQLServer() が GraphQL エンドポイントの土台を作り、
// AddQueryType<T> / AddMutationType<T> で「どのC#クラスをQuery/Mutationのルートにするか」を教える。
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>();

var app = builder.Build();

// /graphql に GraphQL エンドポイントを公開する。
// 開発環境でブラウザから http://localhost:xxxx/graphql を開くと、
// 「Nitro」というGraphQL用のIDE（クエリを試し打ちできる画面）が表示される。
app.MapGraphQL();

app.Run();
