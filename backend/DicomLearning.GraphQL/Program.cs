using System.Text;
using DicomLearning.GraphQL.Constants;
using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.GraphQL;
using DicomLearning.GraphQL.Services;
using DicomLearning.GraphQL.Configuration;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;

// ======================================================
// このファイル(Program.cs)の全体像 ― ASP.NET Coreアプリの「起動スクリプト」
// ======================================================
// ASP.NET Coreのアプリは、大きく2段階の手続きで組み立てる。
//
//   ① builder.Services.AddXxx(...)   … "DIコンテナ" に「この型が欲しくなったら
//        こうやって作ってね」というレシピを登録するフェーズ（99行目の builder.Build() まで）。
//        ここで登録した型は、後からコンストラクタの引数やメソッドの引数に
//        "その型をただ書くだけ" で自動的にインスタンスが渡ってくるようになる。
//        これが「DI（Dependency Injection / 依存性の注入）」で、ASP.NET Core全体の土台となる仕組み。
//
//   ② app.UseXxx(...) / app.MapXxx(...)  … 実際にHTTPリクエストが来たときに
//        「どんな順番で処理するか」というパイプライン（流れ作業のライン）を組み立てるフェーズ
//        （99行目の builder.Build() 以降）。
//        UseXxx は「全リクエストに共通で通す処理」（認証チェックなど）を追加し、
//        MapXxx は「このURLパスに来たらこの処理を実行する」というルーティングを登録する。
//
// ①と②は完全に別物で、①でDIコンテナに登録していない型は②のどこでも自動注入できない、
// という関係になっている（例: 38行目で AddScoped<DicomUploadService>() と登録しているからこそ、
// 155行目の MapPost のラムダ引数に DicomUploadService uploadService と書くだけで
// 実体が渡ってくる。詳細は155行目のコメントを参照）。
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
// AddXxx系メソッドの名前についている "Scoped" は、そのサービスが
// 「いつインスタンスを使い回すか」という寿命（ライフタイム）を表す。3種類ある:
//   - AddSingleton … アプリ起動から終了まで、ずっと同じ1個のインスタンスを使い回す。
//   - AddScoped    … リクエスト1件（GraphQLなら1クエリ/1ミューテーション）ごとに新しいインスタンス。
//                     同じリクエスト内で複数回注入されても同じインスタンスが渡る。
//   - AddTransient … 注入されるたびに毎回新しいインスタンス。
// DbContext（DB接続を持つ）はリクエストをまたいで使い回すと事故りやすいため Scoped が定石。
//
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
        // ======================================================
        // JWTをAuthorizationヘッダーではなくhttpOnly Cookieから読み取る
        // ======================================================
        // フロントエンドはもうJWTの値そのものを知らない（localStorageに保存しない）ため、
        // Authorizationヘッダーを自分で組み立てて送ることができない。代わりにブラウザが
        // Cookieを自動送信してくるので、ここでCookieの中身をトークンとして扱うよう教える。
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (context.Request.Cookies.TryGetValue(AppConstants.AuthCookieName, out var token))
                {
                    context.Token = token;
                }
                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAuthorization();

// Mutation側でHttpContext（Cookieの設定・削除、ログイン中ユーザーの判定）にアクセスするために必要。
builder.Services.AddHttpContextAccessor();

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
            .AllowAnyMethod()
            // 認証をhttpOnly Cookieに変更したため、ブラウザにCookieを一緒に送らせる／
            // 受け取ったSet-CookieをJSに見せる（CORSの credentials モード）には
            // 明示的な許可が必要。ワイルドカードオリジン（*）とは併用できない仕様のため、
            // WithOrigins()で許可オリジンを個別指定していることが前提になる。
            .AllowCredentials());
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

// ======================================================
// DICOM画像配信（静的ファイル配信）
// ======================================================
// アップロード保存先（Storage:DicomRoot 配下）を "/dicom-files" に直接マウントして配信する。
// フロントのcanvas描画（dicom.ts経由のfetch）はここからファイル本体を取得し、
// GraphQL側はメタデータ（UserSop.FilePath等）だけを扱う。
var dicomStorageOptions = builder.Configuration.GetSection("Storage").Get<DicomStorageOptions>()
    ?? new DicomStorageOptions();
var dicomRootFullPath = System.IO.Path.Combine(builder.Environment.ContentRootPath, dicomStorageOptions.DicomRoot);
Directory.CreateDirectory(dicomRootFullPath);
// ".dcm" はASP.NET Core既定のFileExtensionContentTypeProviderに登録が無く、
// 既定設定のままだと「Content-Typeを判定できないファイルは404にする」挙動によりDICOMファイルが
// 一切配信されない（ServeUnknownFileTypesの既定値はfalse）。".dcm"のMIMEタイプを明示的に追加して解決する。
var dicomContentTypeProvider = new FileExtensionContentTypeProvider();
dicomContentTypeProvider.Mappings[".dcm"] = "application/dicom";
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(dicomRootFullPath),
    RequestPath = "/dicom-files",
    ContentTypeProvider = dicomContentTypeProvider,
});

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
//
// 【DicomUploadService uploadService はどこからやってくるのか】
// これは "Minimal API のパラメータバインディング" という機能で、書いた覚えがなくても
// 自動的に実体（インスタンス）が渡ってくる。仕組みは次の通り:
//
//   1. app.MapPost(パス, ラムダ式) と書くと、ASP.NET Coreはこのラムダの引数を1個ずつ見て、
//      「HTTPリクエストの中身（クエリ文字列やボディ）から取れる型」と
//      「DIコンテナに登録されているサービスの型」を自動判別する。
//      HttpRequest はASP.NET Core組み込みの特別な型なのでリクエストそのものが渡され、
//      DicomUploadService は組み込み型でもプリミティブ型でもないため「DIコンテナから取る」と判断される。
//   2. DIコンテナには 38行目の `builder.Services.AddScoped<DicomUploadService>();` で
//      「DicomUploadServiceが要求されたら、コンストラクタの引数(DicomDbContext等)も
//      芋づる式に解決してnewしてね」というレシピが事前に登録済み。
//   3. リクエストが来るたびに、そのレシピに従って新しい DicomUploadService インスタンスが
//      作られ（Scoped＝リクエスト1件につき1つ）、この uploadService 引数に渡される。
//
// つまり「38行目で登録 → 155行目で型名を書くだけで自動的に注文が通る」という関係になっている。
// もし38行目の登録を消すと、ここで実行時エラー（サービスが見つからない）になる。
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
