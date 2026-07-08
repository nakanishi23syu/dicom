namespace DicomLearning.GraphQL.Models;

// ======================================================
// DicomInstance — DICOM画像1枚を表すモデル
// ======================================================
// フロントエンド（src/types/dicom.ts の DicomInstance）に対応する概念だが、
// こちらは「バックエンドが管理する既読/未読フラグ」を追加で持つ点が異なる。
//
// SYNAPSE_LEAD案件の面談議事録・用語集で触れられている「読影」という業務行為は、
// 「読影医がまだ見ていない画像」と「もう見た画像」を区別する必要がある。
// このIsRead以下のプロパティ群は、その最小限の仮実装。
public sealed class DicomInstance
{
    public required string SopInstanceUid { get; init; }
    public required string InstanceNumber { get; init; }
    public required string FilePath { get; init; }

    // ── 既読/未読フラグ（このプロジェクトの主目的の仮実装） ──
    public bool IsRead { get; set; }

    // 既読にした日時。未読に戻すとnullに戻す。
    public DateTimeOffset? ReadAt { get; set; }

    // 誰が既読にしたか（読影医のユーザーID等を想定）。
    public string? ReadByUserId { get; set; }
}
