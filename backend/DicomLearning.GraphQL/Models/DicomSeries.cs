namespace DicomLearning.GraphQL.Models;

// ======================================================
// DicomSeries — 1回の撮影条件のまとまり
// ======================================================
// src/types/dicom.ts の DicomSeries に対応する概念。
// Study（検査） > Series（シリーズ） > Instance（画像1枚） の中間階層。
public sealed class DicomSeries
{
    public required string SeriesInstanceUid { get; init; }
    public required string SeriesNumber { get; init; }
    public string SeriesDescription { get; init; } = "";
    public string Modality { get; init; } = "";
    public required List<DicomInstance> Instances { get; init; }

    // このシリーズに含まれる画像のうち、未読が何件残っているか。
    // GraphQL上では「もう計算済みの値」として単純に公開する（プロパティなのでリゾルバ不要）。
    public int UnreadCount => Instances.Count(i => !i.IsRead);
}
