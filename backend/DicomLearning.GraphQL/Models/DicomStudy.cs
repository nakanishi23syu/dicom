namespace DicomLearning.GraphQL.Models;

// ======================================================
// DicomStudy — 1回の検査を表すモデル
// ======================================================
// src/types/dicom.ts の DicomStudy に対応する概念。
// PatientId が同じ複数の DicomStudy を日付順に並べたものが、
// SYNAPSE_LEAD用語集にある「タイムラインビュー」の元データになる
// （Query.GetPatientTimeline を参照）。
public sealed class DicomStudy
{
    public required string StudyInstanceUid { get; init; }
    public required string PatientId { get; init; }
    public required string PatientName { get; init; }

    // DICOMの日付は本来 "yyyyMMdd" の文字列だが、
    // タイムライン（時系列）の並び替えをしやすいよう DateOnly で持つ。
    public required DateOnly StudyDate { get; init; }

    public string StudyDescription { get; init; } = "";
    public string Modality { get; init; } = "";
    public string AccessionNumber { get; init; } = "";
    public required List<DicomSeries> Series { get; init; }
}
