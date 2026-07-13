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
//
// 【クラス名の後ろの (DicomDbContext db, ...) は何か ―― プライマリコンストラクタ】
// これはC# 12で追加された糖衣構文（"プライマリコンストラクタ"）で、下のコードと完全に同じ意味になる:
//
//   public sealed class DicomUploadService
//   {
//       private readonly DicomDbContext db;
//       private readonly IOptions<DicomStorageOptions> storageOptions;
//       private readonly IHostEnvironment env;
//
//       public DicomUploadService(DicomDbContext db, IOptions<DicomStorageOptions> storageOptions, IHostEnvironment env)
//       {
//           this.db = db;
//           this.storageOptions = storageOptions;
//           this.env = env;
//       }
//   }
//
// つまり db / storageOptions / env は「フィールドに保存されたコンストラクタ引数」であり、
// クラス内のどのメソッドからでもそのまま使える（下のメソッド内で db.UserSops のように
// 何の前置きもなく登場しているのはこのため）。
// 実際にこの3つの引数を渡してインスタンスを作るのはDIコンテナ側
// （Program.cs の `builder.Services.AddScoped<DicomUploadService>();`）であり、
// DicomDbContext・IOptions&lt;DicomStorageOptions&gt;・IHostEnvironment がいずれも
// DIコンテナに登録済みの型だからこそ、自動的に解決してnewしてもらえる。
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
        // DB上のFilePathはDicomRootからの相対パスのみを持つ（Storage設定を変更しても
        // 過去データのURLが壊れないようにするため。実ディスクへの保存パスはここで別途組み立てる）。
        var relativePath = BuildRelativePath(studyUid, seriesUid, sopUid);

        var sop = new UserSop
        {
            SopInstanceUid = sopUid,
            InstanceNumber = ds.GetSingleValueOrDefault(DicomTag.InstanceNumber, ""),
            FilePath = relativePath,
            IsRead = false,
            Order = sopOrder,
        };
        series.Sops.Add(sop);

        var fullPath = ResolveFullPath(relativePath);
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

    // DB保存用の相対パス（DicomRootを起点とした相対パス）: {StudyUID}/{SeriesUID}/{SopUID}.dcm
    // DB上は常にスラッシュ区切りで統一する（Path.Combineの結果はWindowsだとバックスラッシュになるため）。
    private static string BuildRelativePath(string studyUid, string seriesUid, string sopUid) =>
        string.Join('/', studyUid, seriesUid, $"{sopUid}.dcm");

    // 相対パス→実ディスクパスの変換（保存・削除の両方から使う）。
    private string ResolveFullPath(string relativePath) =>
        System.IO.Path.Combine(env.ContentRootPath, storageOptions.Value.DicomRoot, relativePath);

    // ======================================================
    // 削除系（Mutation.DeleteStudy/DeleteSeries/DeleteSopAsync から呼ばれる）
    // ======================================================
    // DB側の削除はEF CoreのCascade設定に任せ、こちらはディスク上の実ファイルだけを消す。
    // 既に手動で消されている等でファイルが無くても例外にしない（削除の目的は達成されているため）。
    public void DeleteStudyFiles(string studyUid)
    {
        var dir = System.IO.Path.Combine(env.ContentRootPath, storageOptions.Value.DicomRoot, studyUid);
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    public void DeleteSeriesFiles(string studyUid, string seriesUid)
    {
        var dir = System.IO.Path.Combine(env.ContentRootPath, storageOptions.Value.DicomRoot, studyUid, seriesUid);
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }

    public void DeleteSopFile(string relativeFilePath)
    {
        var fullPath = ResolveFullPath(relativeFilePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }

    // ======================================================
    // DICOMタグへの復元系（Mutation.RevertStudy/Series/SopFieldsAsync から呼ばれる）
    // ======================================================
    // インライン編集（UpdateXxxFieldsAsync）で上書きされた値を、実際のDICOMファイルに
    // 書かれているタグの値に戻す。DBには「編集前の値」を別途保持していないため、
    // 実ファイルそのものを都度読み直すことで「タグの値」を取得する
    // （FilePathはinit専用でアップロード後に変わらないため、常に元のファイルを指している）。
    public async Task RevertStudyTagsAsync(UserStudy study, string anyRelativeFilePathInStudy)
    {
        var ds = await OpenDatasetAsync(anyRelativeFilePathInStudy);
        study.PatientId = ds.GetSingleValueOrDefault(DicomTag.PatientID, "");
        study.PatientName = ds.GetSingleValueOrDefault(DicomTag.PatientName, "");
        if (ds.TryGetSingleValue<DateTime>(DicomTag.StudyDate, out var parsedDate))
        {
            study.StudyDate = DateOnly.FromDateTime(parsedDate);
        }
        study.StudyDescription = ds.GetSingleValueOrDefault(DicomTag.StudyDescription, "");
        study.Modality = ds.GetSingleValueOrDefault(DicomTag.Modality, "");
        study.AccessionNumber = ds.GetSingleValueOrDefault(DicomTag.AccessionNumber, "");
        study.BodyPartExamined = ds.GetSingleValueOrDefault(DicomTag.BodyPartExamined, "");
    }

    public async Task RevertSeriesTagsAsync(UserSeries series, string anyRelativeFilePathInSeries)
    {
        var ds = await OpenDatasetAsync(anyRelativeFilePathInSeries);
        series.SeriesNumber = ds.GetSingleValueOrDefault(DicomTag.SeriesNumber, "");
        series.SeriesDescription = ds.GetSingleValueOrDefault(DicomTag.SeriesDescription, "");
        series.Modality = ds.GetSingleValueOrDefault(DicomTag.Modality, "");
    }

    public async Task RevertSopTagsAsync(UserSop sop)
    {
        var ds = await OpenDatasetAsync(sop.FilePath);
        sop.InstanceNumber = ds.GetSingleValueOrDefault(DicomTag.InstanceNumber, "");
    }

    private async Task<DicomDataset> OpenDatasetAsync(string relativeFilePath)
    {
        var fullPath = ResolveFullPath(relativeFilePath);
        var file = await DicomFile.OpenAsync(fullPath);
        return file.Dataset;
    }

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
