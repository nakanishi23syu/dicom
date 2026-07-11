namespace DicomLearning.GraphQL.Models;

// ======================================================
// UserSeries — 1回の撮影条件のまとまり（テーブル: user_series）
// ======================================================
// src/types/dicom.ts の DicomSeries に対応する概念。
// Study（検査） > Series（シリーズ） > Sop（画像1枚） の中間階層。
public sealed class UserSeries
{
    public int Id { get; set; }

    public required string SeriesInstanceUid { get; init; }
    public required string SeriesNumber { get; init; }
    public string SeriesDescription { get; init; } = "";
    public string Modality { get; init; } = "";

    // 親（UserStudy）への外部キー
    public int UserStudyId { get; set; }
    public UserStudy? Study { get; init; }

    public List<UserSop> Sops { get; init; } = [];

    // このシリーズに含まれる画像のうち、未読が何件残っているか。
    // GraphQL上では「もう計算済みの値」として単純に公開する（DBカラムではない。DbContext側でIgnore設定）。
    public int UnreadCount => Sops.Count(s => !s.IsRead);
}
