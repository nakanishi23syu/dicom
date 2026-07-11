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
}
