using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.Models;
using HotChocolate;

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
    public DicomInstance MarkInstanceAsRead(
        string sopInstanceUid,
        string userId,
        [Service] InMemoryDicomRepository repository) =>
        repository.MarkInstanceAsRead(sopInstanceUid, userId);

    // ── 画像を未読に戻す（誤って既読にしてしまった場合の取り消し等を想定） ──
    public DicomInstance MarkInstanceAsUnread(
        string sopInstanceUid,
        [Service] InMemoryDicomRepository repository) =>
        repository.MarkInstanceAsUnread(sopInstanceUid);
}
