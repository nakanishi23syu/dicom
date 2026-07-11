using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.GraphQL;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// DIコンテナへの登録
// ======================================================
// DicomDbContext は SQLite（appsettings.json の ConnectionStrings:Dicom）に永続化するDbContext。
// AddDbContext は既定で Scoped 登録される＝GraphQLのリクエスト1件ごとに新しいインスタンスが使われる。
builder.Services.AddDbContext<DicomDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Dicom")));

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

// ======================================================
// 起動時にDBマイグレーションを適用し、データが空ならサンプルデータを投入する
// ======================================================
// DbContextはScopedなので、アプリ起動時（DIスコープの外）で使うには
// 明示的にスコープを作って取り出す必要がある。
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DicomDbContext>();
    db.Database.Migrate();
    DbSeeder.SeedIfEmpty(db);
}

// /graphql に GraphQL エンドポイントを公開する。
// 開発環境でブラウザから http://localhost:xxxx/graphql を開くと、
// 「Nitro」というGraphQL用のIDE（クエリを試し打ちできる画面）が表示される。
app.MapGraphQL();

app.Run();
