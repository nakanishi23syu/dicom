using System.Text;
using DicomLearning.GraphQL.Constants;
using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.GraphQL;
using DicomLearning.GraphQL.Services;
using DicomLearning.GraphQL.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// ======================================================
// リクエストサイズ上限の緩和（DICOMアップロード対応）
// ======================================================
// KestrelはデフォルトでHTTPリクエストボディを30MBまでしか受け付けない。
// DICOM検査は1検査でも数十〜数百MBになることが珍しくなく
// （CTの1シリーズだけで数百枚のスライスがあるため）、複数ファイルをまとめて
// POSTする /api/dicom-upload では既定値だと簡単に超えてしまう。
// 学習用ツールとしての現実的な上限として500MBまで許容する。
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 500 * 1024 * 1024;
});

// ======================================================
// DIコンテナへの登録
// ======================================================
// DicomDbContext は SQLite（appsettings.json の ConnectionStrings:Dicom）に永続化するDbContext。
// AddDbContext は既定で Scoped 登録される＝GraphQLのリクエスト1件ごとに新しいインスタンスが使われる。
builder.Services.AddDbContext<DicomDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Dicom")));

// DICOMアップロード機能: 保存先フォルダの設定 + アップロード処理サービス本体。
builder.Services.Configure<DicomStorageOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.AddScoped<DicomUploadService>();

// ======================================================
// JWT認証の設定
// ======================================================
// appsettings.json（実際の値はappsettings.Development.json）の "Jwt" セクションから
// Issuer/Audience/署名鍵を読み込む。AddJwtBearer が「Authorizationヘッダーの
// Bearerトークンを検証する」処理をASP.NET Coreパイプラインに組み込む。
var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.Configure<JwtOptions>(jwtSection);
builder.Services.AddScoped<AuthService>();

var jwtOptions = jwtSection.Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            // トークンの有効期限切れを判定する際、サーバー間の時計のズレを許容する猶予（既定5分）を0にする。
            ClockSkew = TimeSpan.Zero,
        };
    });
builder.Services.AddAuthorization();

// ======================================================
// CORS設定（フロントエンドからのクロスオリジン通信を許可する）
// ======================================================
// フロントエンド（Vite開発サーバー、既定で http://localhost:5173）と
// バックエンド（このASP.NET Coreアプリ、既定で http://localhost:5030）はポートが異なるため、
// ブラウザの同一オリジンポリシーにより、CORSを許可しないとfetchが失敗する。
// 許可オリジンは appsettings.json の Cors:AllowedOrigins（環境変数 Cors__AllowedOrigins でも上書き可）で管理する。
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(AppConstants.FrontendCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

// ======================================================
// GraphQLサーバーの設定
// ======================================================
// AddGraphQLServer() が GraphQL エンドポイントの土台を作り、
// AddQueryType<T> / AddMutationType<T> で「どのC#クラスをQuery/Mutationのルートにするか」を教える。
// .AddAuthorization() で HotChocolate に [Authorize] 属性を解釈させる（ASP.NET Core標準の
// AddAuthorization とは別物で、GraphQL側のミドルウェアを有効化するために必要）。
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddAuthorization();

var app = builder.Build();

app.UseCors(AppConstants.FrontendCorsPolicy);

// UseAuthentication（「誰か」を判定）→ UseAuthorization（「その人に権限があるか」を判定）の順で登録する。
// この順序を逆にすると認可判定の時点でユーザー情報が確定しておらず正しく動作しない。
app.UseAuthentication();
app.UseAuthorization();

// ======================================================
// 起動時にDBマイグレーションを適用し、データが空ならサンプルデータを投入する
// ======================================================
// DbContextはScopedなので、アプリ起動時（DIスコープの外）で使うには
// 明示的にスコープを作って取り出す必要がある。
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DicomDbContext>();
    var authService = scope.ServiceProvider.GetRequiredService<AuthService>();
    db.Database.Migrate();
    DbSeeder.SeedIfEmpty(db, authService);
}

// /graphql に GraphQL エンドポイントを公開する。
// 開発環境でブラウザから http://localhost:xxxx/graphql を開くと、
// 「Nitro」というGraphQL用のIDE（クエリを試し打ちできる画面）が表示される。
app.MapGraphQL();

// ======================================================
// DICOMアップロード用エンドポイント（REST）
// ======================================================
// GraphQLでもファイルアップロード自体は不可能ではないが（multipart request spec）、
// 素の `multipart/form-data` POSTで十分かつシンプルなため、ここだけ通常のHTTP APIにしている。
// フロントエンドからは `FormData` に複数ファイルを詰めてPOSTする想定
// （frontend/src/services/uploadService.ts を参照）。
app.MapPost("/api/dicom-upload", async (HttpRequest request, DicomUploadService uploadService) =>
{
    if (!request.HasFormContentType)
    {
        return Results.BadRequest("multipart/form-data 形式で送信してください。");
    }

    var form = await request.ReadFormAsync();
    var results = new List<DicomUploadResult>();

    // 1ファイルずつ処理する（DicomUploadService内で毎回SaveChangesしているため、
    // 同じ検査内の2枚目以降のファイルも正しく親Study/Seriesを見つけられる）。
    foreach (var file in form.Files)
    {
        await using var stream = file.OpenReadStream();
        results.Add(await uploadService.UploadOneAsync(stream, file.FileName));
    }

    return Results.Ok(results);
});

app.Run();
