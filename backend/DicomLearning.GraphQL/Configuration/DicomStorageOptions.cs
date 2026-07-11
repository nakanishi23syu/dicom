namespace DicomLearning.GraphQL.Configuration;

// ======================================================
// DicomStorageOptions — DICOMファイルの保存先設定
// ======================================================
// appsettings.json の "Storage" セクションから読み込む（Program.cs の Configure<T> を参照）。
// アップロードされたDICOM画像は、Vue側（frontend/public等）ではなく、
// このバックエンド側のフォルダにのみ保存する方針（追加指示書「dicom画像はバックエンド側の
// 適切な場所に入れてほしい」に対応）。
public sealed class DicomStorageOptions
{
    // 実行ディレクトリ（ContentRootPath）からの相対パス、または絶対パス。
    public string DicomRoot { get; set; } = "Storage/dicom";
}
