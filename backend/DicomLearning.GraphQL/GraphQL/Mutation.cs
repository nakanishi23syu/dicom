using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.Models;
using HotChocolate;
using Microsoft.EntityFrameworkCore;

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
public class Mutation
{
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
        return sop ?? throw new ArgumentException(
            $"指定されたSOP Instance UIDの画像が見つかりません: {sopInstanceUid}");
    }

    // ======================================================
    // 並べ替え保存（Notion風ドラッグ&ドロップ並べ替え）
    // ======================================================
    // フロントエンドでドラッグ&ドロップして決めた新しい並び順を、
    // UIDの配列（orderedXxxUids）として渡してもらい、Orderカラムに書き込む。
    // 検査・シリーズ・SOPの3箇所で同じ形の処理が必要なため、
    // ApplyReorderAsync に共通ロジックをまとめている（IOrderableインターフェース経由）。
    // 戻り値は「実際に見つかって更新できた件数」。渡されたUIDがDB上に無い場合はカウントされない。

    public Task<int> ReorderStudiesAsync(List<string> orderedStudyInstanceUids, [Service] DicomDbContext db) =>
        ApplyReorderAsync(db.UserStudies, orderedStudyInstanceUids, db);

    public Task<int> ReorderSeriesAsync(List<string> orderedSeriesInstanceUids, [Service] DicomDbContext db) =>
        ApplyReorderAsync(db.UserSeries, orderedSeriesInstanceUids, db);

    public Task<int> ReorderSopsAsync(List<string> orderedSopInstanceUids, [Service] DicomDbContext db) =>
        ApplyReorderAsync(db.UserSops, orderedSopInstanceUids, db);

    private static async Task<int> ApplyReorderAsync<TEntity>(
        DbSet<TEntity> set,
        IReadOnlyList<string> orderedKeys,
        DicomDbContext db)
        where TEntity : class, IOrderable
    {
        // 学習用プロジェクト規模のデータ量を前提に、対象テーブルを全件メモリに載せてから
        // UIDでの引き当てを行っている（件数が増えた場合はWHERE句での絞り込みを検討）。
        var entities = await set.ToListAsync();
        var byKey = entities.ToDictionary(e => ((IOrderable)e).ReorderKey);

        var matched = 0;
        for (var i = 0; i < orderedKeys.Count; i++)
        {
            if (byKey.TryGetValue(orderedKeys[i], out var entity))
            {
                entity.Order = i;
                matched++;
            }
        }

        await db.SaveChangesAsync();
        return matched;
    }
}
