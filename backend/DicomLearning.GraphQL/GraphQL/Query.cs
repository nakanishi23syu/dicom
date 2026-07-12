using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.Models;
using HotChocolate;
using Microsoft.EntityFrameworkCore;

namespace DicomLearning.GraphQL.GraphQL;

// ======================================================
// Query — GraphQLの「Query」ルートタイプ
// ======================================================
// 【HotChocolateのコードファースト方式とは】
// スキーマ（.graphqlファイル）を先に書く「スキーマファースト」ではなく、
// 普通のC#クラス・メソッドを書くと、そこからHotChocolateが自動でGraphQLスキーマを生成する。
// このクラスの public メソッドがそのまま GraphQL の「フィールド」になる。
//
// 例えば下の GetStudiesAsync() メソッドは、GraphQL上では次のように呼び出せる:
//   query {
//     studies {
//       studyInstanceUid
//       patientName
//       series { seriesDescription unreadCount }
//     }
//   }
// ※ HotChocolateの命名規則により、メソッド名先頭の "Get" と末尾の "Async" は取り除かれ、
//   camelCase（studies）としてスキーマに公開される。
//
// [Service] 属性: このパラメータは GraphQL のクエリ引数ではなく、
// ASP.NET Core の DI コンテナから注入されることを示す。
// Program.cs で AddDbContext<DicomDbContext>() 済みのインスタンス（リクエストごとのScoped）が渡ってくる。
//
// N+1問題について: Series/Sopsは Include で一括読み込みしている（DataLoaderは今回未導入。
// 将来アクセスが増えた場合は HotChocolate 同梱の GreenDonut を検討する）。
public class Query
{
    // 「サイトアクセス時はDBのorder順」（指示書2.md 要望2）を満たすため、Study/Series/Sopのいずれも
    // Orderカラム昇順で返す。Include内にOrderByを書くと、そのネストしたコレクション自体も
    // その順序で読み込まれる（EF Core 5+の機能。Include後にToListAsync側でOrderByし直す必要がない）。
    public async Task<List<UserStudy>> GetStudiesAsync([Service] DicomDbContext db) =>
        await db.UserStudies
            .Include(s => s.Series.OrderBy(se => se.Order))
            .ThenInclude(se => se.Sops.OrderBy(sop => sop.Order))
            .OrderBy(s => s.Order)
            .ToListAsync();

    public async Task<UserSeries?> GetSeriesAsync(string seriesInstanceUid, [Service] DicomDbContext db) =>
        await db.UserSeries
            .Include(se => se.Sops.OrderBy(sop => sop.Order))
            .FirstOrDefaultAsync(se => se.SeriesInstanceUid == seriesInstanceUid);

    // ── 関連用語集.md の「タイムラインビュー」を模したクエリ ──
    // 同一患者の過去検査を新しい順に並べて返す。用語集にある「比較読影」の土台になる情報。
    // query { patientTimeline(patientId: "patient-001") { studyDate studyDescription } }
    public async Task<List<UserStudy>> GetPatientTimelineAsync(
        string patientId,
        [Service] DicomDbContext db) =>
        await db.UserStudies
            .Where(s => s.PatientId == patientId)
            .Include(s => s.Series)
            .ThenInclude(se => se.Sops)
            .OrderByDescending(s => s.StudyDate)
            .ToListAsync();

    // ── 未読画像の一覧 ──
    // 読影医が次に見るべき画像の「読影ワークリスト」のようなイメージ。
    public async Task<List<UserSop>> GetUnreadInstancesAsync([Service] DicomDbContext db) =>
        await db.UserSops
            .Where(sop => !sop.IsRead)
            .ToListAsync();
}
