using DicomLearning.GraphQL.Configuration;
using DicomLearning.GraphQL.Constants;
using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.Models;
using DicomLearning.GraphQL.Services;
using HotChocolate;
using HotChocolate.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DicomLearning.GraphQL.GraphQL;

// ======================================================
// Mutation — GraphQLの「Mutation」ルートタイプ
// ======================================================
// GraphQLには「読み取り(Query)」と「書き込み(Mutation)」で
// ルートタイプを分ける慣習がある（技術的にはQueryでも書き込みは可能だが、
// 「副作用があるかどうか」をスキーマ上で明確に区別するための約束事）。
//
// このクラスのメソッドは以下のように呼び出す:
//   mutation {
//     markInstanceAsRead(sopInstanceUid: "...", userId: "dr-tanaka") {
//       sopInstanceUid
//       isRead
//       readAt
//     }
//   }
//
// [Authorize] 属性について: HotChocolate.AspNetCore.Authorization パッケージが提供するもので、
// ASP.NET CoreのJWT認証（Program.cs の AddJwtBearer）と連動する。
// 属性なしのフィールドは未ログインでも呼べるが、[Authorize] を付けたフィールドは
// 有効なJWT（Authorizationヘッダー）が無いと呼び出し時にエラーになる。
public class Mutation
{
    // ======================================================
    // ログイン
    // ======================================================
    // ユーザー名・パスワードを照合し、成功したらJWTを発行する。
    // 以前はJWTをレスポンスのtokenフィールドで返し、フロントエンドがlocalStorageに保存して
    // 以降 `Authorization: Bearer <token>` ヘッダーで送っていたが、localStorageは同一オリジンの
    // どんなJavaScript（XSSで混入した悪意あるスクリプト含む）からも読めてしまうため、
    // トークンが盗まれるリスクがあった。
    // 代わりにJWTをhttpOnly Cookieとしてレスポンスヘッダーに直接乗せる方式に変更した。
    // httpOnly Cookieはブラウザが自動送信し、JavaScriptからは読み書きできないため、
    // 万一XSSが起きてもこの経路ではトークンを盗めない。
    // mutation { login(username: "admin", password: "admin1234") { displayName isAdmin } }
    public async Task<AuthPayload> LoginAsync(
        string username,
        string password,
        [Service] DicomDbContext db,
        [Service] AuthService authService,
        [Service] IHttpContextAccessor httpContextAccessor,
        [Service] IOptions<JwtOptions> jwtOptions)
    {
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.Username == username);
        if (user is null || !authService.VerifyPassword(user, password))
        {
            // HotChocolateは既定で「ハンドルしていない例外」を "Unexpected Execution Error" に
            // マスクしてクライアントへ返す（内部エラーの詳細を誤って漏らさないための安全策）。
            // ユーザーへそのまま見せたいメッセージは GraphQLException で明示的に投げる必要がある。
            throw new GraphQLException("ユーザー名またはパスワードが正しくありません。");
        }

        var token = authService.GenerateToken(user);
        AppendAuthCookie(httpContextAccessor, token, jwtOptions.Value.ExpiryMinutes);

        return new AuthPayload
        {
            DisplayName = user.DisplayName,
            IsAdmin = user.IsAdmin,
        };
    }

    // ======================================================
    // ログアウト
    // ======================================================
    // httpOnly CookieはJSから削除できないため、サーバー側で「即座に無効な期限」を持つ
    // 同名Cookieを上書きしてブラウザに削除させる。
    public bool Logout([Service] IHttpContextAccessor httpContextAccessor)
    {
        httpContextAccessor.HttpContext!.Response.Cookies.Delete(AppConstants.AuthCookieName);
        return true;
    }

    private static void AppendAuthCookie(IHttpContextAccessor httpContextAccessor, string token, int expiryMinutes)
    {
        var context = httpContextAccessor.HttpContext!;
        context.Response.Cookies.Append(AppConstants.AuthCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            // フロントエンド（Viteの別ポート）とバックエンドは異なるオリジンのため、
            // クロスサイトのCookie送信を許可するにはSameSite=Noneが必要。
            // SameSite=NoneはSecure（HTTPS）必須というブラウザの仕様があるため、
            // 開発環境（HTTP）ではSecure=falseのSameSite=Laxにフォールバックする
            // （localhost同士のポート違いはブラウザ上「same-site」扱いなのでLaxでも送信される）。
            Secure = context.Request.IsHttps,
            SameSite = context.Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(expiryMinutes),
        });
    }

    // ログインしている読影医なら誰でも可能な操作。
    [Authorize]
    // ── 画像を既読にする（このプロジェクトの主目的の仮実装） ──
    public async Task<UserSop> MarkInstanceAsReadAsync(
        string sopInstanceUid,
        string userId,
        [Service] DicomDbContext db)
    {
        var sop = await FindSopOrThrowAsync(sopInstanceUid, db);
        sop.IsRead = true;
        sop.ReadAt = DateTimeOffset.UtcNow;
        sop.ReadByUserId = userId;
        await db.SaveChangesAsync();
        return sop;
    }

    [Authorize]
    // ── 画像を未読に戻す（誤って既読にしてしまった場合の取り消し等を想定） ──
    public async Task<UserSop> MarkInstanceAsUnreadAsync(
        string sopInstanceUid,
        [Service] DicomDbContext db)
    {
        var sop = await FindSopOrThrowAsync(sopInstanceUid, db);
        sop.IsRead = false;
        sop.ReadAt = null;
        sop.ReadByUserId = null;
        await db.SaveChangesAsync();
        return sop;
    }

    private static async Task<UserSop> FindSopOrThrowAsync(string sopInstanceUid, DicomDbContext db)
    {
        var sop = await db.UserSops.FirstOrDefaultAsync(s => s.SopInstanceUid == sopInstanceUid);
        return sop ?? throw new GraphQLException(
            $"指定されたSOP Instance UIDの画像が見つかりません: {sopInstanceUid}");
    }

    // ======================================================
    // 変更の保存（並べ替え + インライン編集の統合Mutation）
    // ======================================================
    // 以前は「並べ替え保存」（ReorderXxxAsync）と「インライン編集」（UpdateXxxFieldsAsync）が
    // 別々のMutationだった。フロントエンドでも「ドラッグしたら並べ替えAPIを即座に呼ぶ」
    // 「セルの入力からフォーカスが外れたら編集APIを即座に呼ぶ」という2系統の保存が並存し、
    // 保存ボタンも2つに分かれていた。
    // これを「フロントエンドは編集内容をローカルにだけ貯めておき、1つの保存ボタンを
    // 押したときにまとめて送る」方式に統一するため、Mutationも1つに統合した。
    // 送られてくるのは「実際に変更された行だけ」（フロントエンド側で元データとの差分を
    // 取ってから渡す。composables/useEditableList.ts 参照）。
    //
    // 並べ替え（Order変更）は全ユーザーに見える表示順を変える操作のため、
    // 従来どおり管理者アカウントのみに許可する（追加指示書「管理者アカウントなら、
    // できることが増える」に対応）。統合後のMutationは1本だが、変更リストの中に
    // Order指定を含む行が1つでもあれば、その回の呼び出し全体を管理者チェック対象にする。
    // フィールド編集（DICOMタグと整合性が取れなくてもいい）はログイン済みなら誰でも呼べる。
    [Authorize]
    public Task<int> SaveStudyChangesAsync(
        List<StudyChangeInput> changes,
        [Service] DicomDbContext db,
        [Service] IHttpContextAccessor httpContextAccessor) =>
        ApplyChangesAsync(db.UserStudies, changes, db, httpContextAccessor, (study, change) =>
        {
            if (change.PatientId is not null) study.PatientId = change.PatientId;
            if (change.PatientName is not null) study.PatientName = change.PatientName;
            if (change.StudyDate is not null) study.StudyDate = change.StudyDate.Value;
            if (change.StudyDescription is not null) study.StudyDescription = change.StudyDescription;
            if (change.Modality is not null) study.Modality = change.Modality;
        });

    [Authorize]
    public Task<int> SaveSeriesChangesAsync(
        List<SeriesChangeInput> changes,
        [Service] DicomDbContext db,
        [Service] IHttpContextAccessor httpContextAccessor) =>
        ApplyChangesAsync(db.UserSeries, changes, db, httpContextAccessor, (series, change) =>
        {
            if (change.SeriesNumber is not null) series.SeriesNumber = change.SeriesNumber;
            if (change.SeriesDescription is not null) series.SeriesDescription = change.SeriesDescription;
            if (change.Modality is not null) series.Modality = change.Modality;
        });

    [Authorize]
    public Task<int> SaveSopChangesAsync(
        List<SopChangeInput> changes,
        [Service] DicomDbContext db,
        [Service] IHttpContextAccessor httpContextAccessor) =>
        ApplyChangesAsync(db.UserSops, changes, db, httpContextAccessor, (sop, change) =>
        {
            if (change.InstanceNumber is not null) sop.InstanceNumber = change.InstanceNumber;
        });

    private static async Task<int> ApplyChangesAsync<TEntity, TChange>(
        DbSet<TEntity> set,
        List<TChange> changes,
        DicomDbContext db,
        IHttpContextAccessor httpContextAccessor,
        Action<TEntity, TChange> applyFields)
        where TEntity : class, IOrderable
        where TChange : IChangeInput
    {
        if (changes.Count == 0) return 0;

        var hasOrderChange = changes.Any(c => c.Order is not null);
        if (hasOrderChange && httpContextAccessor.HttpContext?.User.IsInRole("Admin") != true)
        {
            throw new GraphQLException("並べ替えの保存は管理者のみ可能です。");
        }

        // 学習用プロジェクト規模のデータ量を前提に、対象テーブルを全件メモリに載せてから
        // UIDでの引き当てを行っている（件数が増えた場合はWHERE句での絞り込みを検討）。
        var entities = await set.ToListAsync();
        var byKey = entities.ToDictionary(e => ((IOrderable)e).ReorderKey);

        var matched = 0;
        foreach (var change in changes)
        {
            if (!byKey.TryGetValue(change.Key, out var entity)) continue;
            if (change.Order is not null) entity.Order = change.Order.Value;
            applyFields(entity, change);
            matched++;
        }

        await db.SaveChangesAsync();
        return matched;
    }

    // ======================================================
    // DICOMタグへの復元
    // ======================================================
    // UpdateXxxFieldsAsyncで編集した値を、実際にアップロードされたDICOMファイルのタグ値に戻す。
    // 「編集前の値」を別カラムに保持しているわけではなく、都度実ファイルを読み直して復元する
    // （DicomUploadService.RevertXxxTagsAsync参照）。編集権限と対称にするため、
    // ログイン済みなら誰でも呼べる（[Authorize]のみ、Admin限定にはしない）。
    [Authorize]
    public async Task<UserStudy> RevertStudyFieldsAsync(
        string studyInstanceUid,
        [Service] DicomDbContext db,
        [Service] DicomUploadService uploadService)
    {
        var study = await db.UserStudies
            .Include(s => s.Series)
            .ThenInclude(se => se.Sops)
            .FirstOrDefaultAsync(s => s.StudyInstanceUid == studyInstanceUid)
            ?? throw new GraphQLException($"指定された検査が見つかりません: {studyInstanceUid}");

        var anyFilePath = study.Series.SelectMany(se => se.Sops).Select(sop => sop.FilePath).FirstOrDefault()
            ?? throw new GraphQLException("この検査には画像が1件も無いため、DICOMタグを復元できません。");

        await uploadService.RevertStudyTagsAsync(study, anyFilePath);
        await db.SaveChangesAsync();
        return study;
    }

    [Authorize]
    public async Task<UserSeries> RevertSeriesFieldsAsync(
        string seriesInstanceUid,
        [Service] DicomDbContext db,
        [Service] DicomUploadService uploadService)
    {
        var series = await db.UserSeries
            .Include(se => se.Sops)
            .FirstOrDefaultAsync(se => se.SeriesInstanceUid == seriesInstanceUid)
            ?? throw new GraphQLException($"指定されたシリーズが見つかりません: {seriesInstanceUid}");

        var anyFilePath = series.Sops.Select(sop => sop.FilePath).FirstOrDefault()
            ?? throw new GraphQLException("このシリーズには画像が1件も無いため、DICOMタグを復元できません。");

        await uploadService.RevertSeriesTagsAsync(series, anyFilePath);
        await db.SaveChangesAsync();
        return series;
    }

    [Authorize]
    public async Task<UserSop> RevertSopFieldsAsync(
        string sopInstanceUid,
        [Service] DicomDbContext db,
        [Service] DicomUploadService uploadService)
    {
        var sop = await FindSopOrThrowAsync(sopInstanceUid, db);
        await uploadService.RevertSopTagsAsync(sop);
        await db.SaveChangesAsync();
        return sop;
    }

    // ======================================================
    // カスケード削除（指示書2.md要望4）
    // ======================================================
    // DB側の親子削除はEF CoreのOnDelete(Cascade)設定（DicomDbContext参照）に任せ、
    // ここではディスク上の実ファイル削除だけをDicomUploadService経由で追加で行う。
    // 削除は取り消せない操作のため、並べ替え保存と同様に管理者アカウントのみに限定している。
    [Authorize(Roles = ["Admin"])]
    public async Task<bool> DeleteStudyAsync(
        string studyInstanceUid,
        [Service] DicomDbContext db,
        [Service] DicomUploadService uploadService)
    {
        var study = await db.UserStudies.FirstOrDefaultAsync(s => s.StudyInstanceUid == studyInstanceUid)
            ?? throw new GraphQLException($"指定された検査が見つかりません: {studyInstanceUid}");

        db.UserStudies.Remove(study);
        await db.SaveChangesAsync();
        uploadService.DeleteStudyFiles(study.StudyInstanceUid);
        return true;
    }

    [Authorize(Roles = ["Admin"])]
    public async Task<bool> DeleteSeriesAsync(
        string seriesInstanceUid,
        [Service] DicomDbContext db,
        [Service] DicomUploadService uploadService)
    {
        var series = await db.UserSeries
            .Include(se => se.Study)
            .FirstOrDefaultAsync(se => se.SeriesInstanceUid == seriesInstanceUid)
            ?? throw new GraphQLException($"指定されたシリーズが見つかりません: {seriesInstanceUid}");

        var studyInstanceUid = series.Study!.StudyInstanceUid;
        db.UserSeries.Remove(series);
        await db.SaveChangesAsync();
        uploadService.DeleteSeriesFiles(studyInstanceUid, series.SeriesInstanceUid);
        return true;
    }

    [Authorize(Roles = ["Admin"])]
    public async Task<bool> DeleteSopAsync(
        string sopInstanceUid,
        [Service] DicomDbContext db,
        [Service] DicomUploadService uploadService)
    {
        var sop = await FindSopOrThrowAsync(sopInstanceUid, db);

        db.UserSops.Remove(sop);
        await db.SaveChangesAsync();
        uploadService.DeleteSopFile(sop.FilePath);
        return true;
    }
}
