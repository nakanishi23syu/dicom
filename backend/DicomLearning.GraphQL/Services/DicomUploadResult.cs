namespace DicomLearning.GraphQL.Services;

// ======================================================
// DicomUploadResult — アップロード1ファイル分の結果
// ======================================================
// フロントエンドはこれをファイルごとに受け取り、「成功/失敗/スキップ」を一覧表示する。
public sealed class DicomUploadResult
{
    public required string FileName { get; init; }
    public required bool Success { get; init; }
    public string? StudyInstanceUid { get; init; }
    public string? SeriesInstanceUid { get; init; }
    public string? SopInstanceUid { get; init; }
    public required string Message { get; init; }
}
