using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.Models;
using DicomLearning.GraphQL.Configuration;
using FellowOakDicom;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DicomLearning.GraphQL.Services;

// ======================================================
// DicomUploadService — アップロードされたDICOMファイル1枚を保存・DB登録する
// ======================================================
// 1. fo-dicom（FellowOakDicom）でファイルの中身を解析し、必要なタグを取り出す
// 2. Study/Series/SOPが既にDBにあるかUIDで確認し、無ければ作成する（無ければ作る＝upsert）
// 3. ファイル本体は Vue側ではなく、このバックエンドのストレージフォルダに保存する
//
// 複数ファイルを連続アップロードする際、"同じ検査の2枚目以降のファイル" は
// 1枚目で作成したStudy/Seriesを再利用する必要があるため、
// 呼び出し側（DicomUploadEndpoints）は1ファイル処理するごとに SaveChangesAsync している
// （そうしないと、2枚目の検索時にまだDB未反映の1枚目のStudyが見つからない）。
public sealed class DicomUploadService(
    DicomDbContext db,
    IOptions<DicomStorageOptions> storageOptions,
    IHostEnvironment env)
{
    public async Task<DicomUploadResult> UploadOneAsync(Stream fileStream, string originalFileName)
    {
        DicomFile dicomFile;
        try
        {
            dicomFile = await DicomFile.OpenAsync(fileStream);
        }
        catch (Exception ex)
        {
            return Fail(originalFileName, $"DICOMファイルとして読み込めませんでした: {ex.Message}");
        }

        var ds = dicomFile.Dataset;
        var studyUid = ds.GetSingleValueOrDefault(DicomTag.StudyInstanceUID, "");
        var seriesUid = ds.GetSingleValueOrDefault(DicomTag.SeriesInstanceUID, "");
        var sopUid = ds.GetSingleValueOrDefault(DicomTag.SOPInstanceUID, "");

        if (string.IsNullOrEmpty(studyUid) || string.IsNullOrEmpty(seriesUid) || string.IsNullOrEmpty(sopUid))
        {
            return Fail(originalFileName, "Study/Series/SOP Instance UIDのいずれかが読み取れませんでした");
        }

        if (await db.UserSops.AnyAsync(s => s.SopInstanceUid == sopUid))
        {
            return Fail(originalFileName, "同じSOP Instance UIDが既に登録済みのためスキップしました", studyUid, seriesUid, sopUid);
        }

        var study = await db.UserStudies.FirstOrDefaultAsync(s => s.StudyInstanceUid == studyUid);
        if (study is null)
        {
            var studyDate = ds.TryGetSingleValue<DateTime>(DicomTag.StudyDate, out var parsedDate)
                ? DateOnly.FromDateTime(parsedDate)
                : DateOnly.FromDateTime(DateTime.Today);

            study = new UserStudy
            {
                StudyInstanceUid = studyUid,
                PatientId = ds.GetSingleValueOrDefault(DicomTag.PatientID, ""),
                PatientName = ds.GetSingleValueOrDefault(DicomTag.PatientName, ""),
                StudyDate = studyDate,
                StudyDescription = ds.GetSingleValueOrDefault(DicomTag.StudyDescription, ""),
                Modality = ds.GetSingleValueOrDefault(DicomTag.Modality, ""),
                AccessionNumber = ds.GetSingleValueOrDefault(DicomTag.AccessionNumber, ""),
                BodyPartExamined = ds.GetSingleValueOrDefault(DicomTag.BodyPartExamined, ""),
                Order = await db.UserStudies.CountAsync(),
            };
            db.UserStudies.Add(study);
        }

        var series = await db.UserSeries.FirstOrDefaultAsync(se => se.SeriesInstanceUid == seriesUid);
        if (series is null)
        {
            series = new UserSeries
            {
                SeriesInstanceUid = seriesUid,
                SeriesNumber = ds.GetSingleValueOrDefault(DicomTag.SeriesNumber, ""),
                SeriesDescription = ds.GetSingleValueOrDefault(DicomTag.SeriesDescription, ""),
                Modality = ds.GetSingleValueOrDefault(DicomTag.Modality, ""),
                Order = await db.UserSeries.CountAsync(se => se.UserStudyId == study.Id),
            };
            // ナビゲーションプロパティ経由で追加すると、study.Idが未確定（新規Study）でも
            // SaveChanges時にEF Coreが外部キー(UserStudyId)を自動的に補ってくれる。
            study.Series.Add(series);
        }

        var sopOrder = await db.UserSops.CountAsync(sop => sop.UserSeriesId == series.Id);
        var filePath = BuildStoragePath(studyUid, seriesUid, sopUid);

        var sop = new UserSop
        {
            SopInstanceUid = sopUid,
            InstanceNumber = ds.GetSingleValueOrDefault(DicomTag.InstanceNumber, ""),
            FilePath = filePath,
            IsRead = false,
            Order = sopOrder,
        };
        series.Sops.Add(sop);

        var fullPath = System.IO.Path.Combine(env.ContentRootPath, filePath);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(fullPath)!);
        await dicomFile.SaveAsync(fullPath);

        await db.SaveChangesAsync();

        return new DicomUploadResult
        {
            FileName = originalFileName,
            Success = true,
            StudyInstanceUid = studyUid,
            SeriesInstanceUid = seriesUid,
            SopInstanceUid = sopUid,
            Message = "アップロードしました",
        };
    }

    // ストレージ上のパス（DB保存用の相対パス）: {DicomRoot}/{StudyUID}/{SeriesUID}/{SopUID}.dcm
    // DB上は常にスラッシュ区切りで統一する（Path.Combineの結果はWindowsだとバックスラッシュになるため）。
    // 実ファイルへの書き込みパス（fullPath）はOS標準の区切りで問題ないので、そちらはPath.Combineのまま使う。
    private string BuildStoragePath(string studyUid, string seriesUid, string sopUid) =>
        string.Join('/', storageOptions.Value.DicomRoot, studyUid, seriesUid, $"{sopUid}.dcm");

    private static DicomUploadResult Fail(
        string fileName,
        string message,
        string? studyUid = null,
        string? seriesUid = null,
        string? sopUid = null) =>
        new()
        {
            FileName = fileName,
            Success = false,
            StudyInstanceUid = studyUid,
            SeriesInstanceUid = seriesUid,
            SopInstanceUid = sopUid,
            Message = message,
        };
}
