using DicomLearning.GraphQL.Models;

namespace DicomLearning.GraphQL.Data;

// ======================================================
// DbSeeder — 開発用のダミーデータをSQLiteに投入する
// ======================================================
// 本物のDICOMファイルは一切読み込まない（フロントエンドとはまだ繋がっていない前提のため）。
// 「PACSにはこういうデータ構造・こういう状態のデータがありそうだ」という
// 仮実装として、関連用語集.md の内容を意識して組み立てている:
//   - 同一患者(patient-001)に複数のStudyを用意し「タイムラインビュー」「比較読影」を再現
//   - 一部のSopだけ既読にしておき「未読/既読」機能の見た目を確認しやすくしている
//
// Program.cs から、起動時に「テーブルが空なら」投入する形で呼び出す。
internal static class DbSeeder
{
    public static void SeedIfEmpty(DicomDbContext db)
    {
        if (db.UserStudies.Any())
        {
            return;
        }

        db.UserStudies.AddRange(
            new UserStudy
            {
                StudyInstanceUid = "1.2.392.study.1",
                PatientId = "patient-001",
                PatientName = "山田 太郎",
                StudyDate = new DateOnly(2026, 4, 2),
                StudyDescription = "胸部単純X線（今回）",
                Modality = "CR",
                AccessionNumber = "ACC-0001",
                BodyPartExamined = "CHEST",
                Order = 0,
                Series =
                [
                    new UserSeries
                    {
                        SeriesInstanceUid = "1.2.392.series.1.1",
                        SeriesNumber = "1",
                        SeriesDescription = "PA",
                        Modality = "CR",
                        Order = 0,
                        Sops =
                        [
                            new UserSop
                            {
                                SopInstanceUid = "1.2.392.instance.1.1.1",
                                InstanceNumber = "1",
                                FilePath = "/dicom/sample-chest-pa.dcm",
                                IsRead = false,
                                Order = 0,
                            },
                        ],
                    },
                ],
            },
            new UserStudy
            {
                // 同じ患者(patient-001)の3か月前の検査。
                // タイムラインビュー・比較読影のデモ用に意図的に用意している。
                StudyInstanceUid = "1.2.392.study.0",
                PatientId = "patient-001",
                PatientName = "山田 太郎",
                StudyDate = new DateOnly(2026, 1, 10),
                StudyDescription = "胸部単純X線（前回・比較読影用）",
                Modality = "CR",
                AccessionNumber = "ACC-0000",
                BodyPartExamined = "CHEST",
                Order = 1,
                Series =
                [
                    new UserSeries
                    {
                        SeriesInstanceUid = "1.2.392.series.0.1",
                        SeriesNumber = "1",
                        SeriesDescription = "PA",
                        Modality = "CR",
                        Order = 0,
                        Sops =
                        [
                            new UserSop
                            {
                                SopInstanceUid = "1.2.392.instance.0.1.1",
                                InstanceNumber = "1",
                                FilePath = "/dicom/sample-chest-pa-prior.dcm",
                                // 前回検査はすでに読影済みという想定で既読にしておく
                                IsRead = true,
                                ReadAt = new DateTimeOffset(2026, 1, 11, 9, 30, 0, TimeSpan.FromHours(9)),
                                ReadByUserId = "dr-suzuki",
                                Order = 0,
                            },
                        ],
                    },
                ],
            },
            new UserStudy
            {
                StudyInstanceUid = "1.2.392.study.2",
                PatientId = "patient-002",
                PatientName = "佐藤 花子",
                StudyDate = new DateOnly(2026, 6, 20),
                StudyDescription = "腹部CT",
                Modality = "CT",
                AccessionNumber = "ACC-0002",
                BodyPartExamined = "ABDOMEN",
                Order = 2,
                Series =
                [
                    new UserSeries
                    {
                        SeriesInstanceUid = "1.2.392.series.2.1",
                        SeriesNumber = "1",
                        SeriesDescription = "造影前",
                        Modality = "CT",
                        Order = 0,
                        Sops =
                        [
                            new UserSop
                            {
                                SopInstanceUid = "1.2.392.instance.2.1.1",
                                InstanceNumber = "1",
                                FilePath = "/dicom/sample-ct-plain-01.dcm",
                                IsRead = false,
                                Order = 0,
                            },
                            new UserSop
                            {
                                SopInstanceUid = "1.2.392.instance.2.1.2",
                                InstanceNumber = "2",
                                FilePath = "/dicom/sample-ct-plain-02.dcm",
                                IsRead = false,
                                Order = 1,
                            },
                        ],
                    },
                    new UserSeries
                    {
                        SeriesInstanceUid = "1.2.392.series.2.2",
                        SeriesNumber = "2",
                        SeriesDescription = "動脈相",
                        Modality = "CT",
                        Order = 1,
                        Sops =
                        [
                            new UserSop
                            {
                                SopInstanceUid = "1.2.392.instance.2.2.1",
                                InstanceNumber = "1",
                                FilePath = "/dicom/sample-ct-arterial-01.dcm",
                                IsRead = false,
                                Order = 0,
                            },
                        ],
                    },
                ],
            });

        db.SaveChanges();
    }
}
