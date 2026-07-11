namespace DicomLearning.GraphQL.Models;

// ======================================================
// UserStudy — 1回の検査を表すEF Coreエンティティ（テーブル: user_study）
// ======================================================
// src/types/dicom.ts の DicomStudy に対応する概念。
// PatientId が同じ複数の UserStudy を日付順に並べたものが、
// 関連用語集.md にある「タイムラインビュー」の元データになる
// （Query.GetPatientTimeline を参照）。
//
// DICOMファイルを毎回パースし直すのは負荷が高いため、一覧・検索・並べ替えで
// よく使う項目（患者名・患者ID・検査日・部位等）をカラムとして外だししている。
public sealed class UserStudy : IOrderable
{
    // DB内部の主キー（DICOMのUIDとは別に、EF Coreのリレーション用に持つ）
    public int Id { get; set; }

    public required string StudyInstanceUid { get; init; }
    public required string PatientId { get; init; }
    public required string PatientName { get; init; }

    // DICOMの日付は本来 "yyyyMMdd" の文字列だが、
    // タイムライン（時系列）の並び替えをしやすいよう DateOnly で持つ。
    public required DateOnly StudyDate { get; init; }

    public string StudyDescription { get; init; } = "";
    public string Modality { get; init; } = "";
    public string AccessionNumber { get; init; } = "";

    // 検査部位（DICOMタグ BodyPartExamined (0018,0015) 相当）。
    public string BodyPartExamined { get; init; } = "";

    // Notion風のドラッグ&ドロップ並べ替えで保存する表示順（並べ替え保存ボタン→Mutation.ReorderStudies）。
    // 「並べ替え適用」を押すまでは既定のOrderBy（検査日等）で表示し、押されたらこの値で並べ替える運用を想定。
    public int Order { get; set; }

    public List<UserSeries> Series { get; init; } = [];

    string IOrderable.ReorderKey => StudyInstanceUid;
}
