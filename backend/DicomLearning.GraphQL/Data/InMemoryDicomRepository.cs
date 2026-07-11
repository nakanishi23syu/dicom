using DicomLearning.GraphQL.Models;

namespace DicomLearning.GraphQL.Data;

// ======================================================
// InMemoryDicomRepository — 「DBの代わり」を務めるダミーリポジトリ
// ======================================================
// 本来ならEF Core + 実際のデータベース（SQL Server等）がこの役割を担う。
// この学習プロジェクトでは「GraphQLサーバーの作り方」を学ぶことが目的なので、
// データの永続化はメモリ上のListで済ませている。
//
// Program.cs で Singleton として DI コンテナに登録するため、
// アプリが起動している間はずっと同じインスタンス・同じデータを保持する
// （アプリを再起動するとデータは初期状態にリセットされる）。
public sealed class InMemoryDicomRepository
{
    // 複数のGraphQLリクエストが同時に既読/未読を更新する可能性があるため、
    // 単純な lock でリスト全体への読み書きを直列化する。
    private readonly object _lock = new();
    private readonly List<DicomStudy> _studies = SampleDataFactory.CreateStudies();

    public IReadOnlyList<DicomStudy> GetStudies()
    {
        lock (_lock)
        {
            return _studies.ToList();
        }
    }

    public DicomSeries? GetSeriesByUid(string seriesInstanceUid)
    {
        lock (_lock)
        {
            return _studies.SelectMany(s => s.Series).FirstOrDefault(se => se.SeriesInstanceUid == seriesInstanceUid);
        }
    }

    // SYNAPSE_LEAD用語集にある「タイムラインビュー」を模したメソッド。
    // 同一患者の検査を新しい順に並べて返す＝比較読影の材料になる。
    public IReadOnlyList<DicomStudy> GetPatientTimeline(string patientId)
    {
        lock (_lock)
        {
            return _studies
                .Where(s => s.PatientId == patientId)
                .OrderByDescending(s => s.StudyDate)
                .ToList();
        }
    }

    public IReadOnlyList<DicomInstance> GetUnreadInstances()
    {
        lock (_lock)
        {
            return _studies
                .SelectMany(s => s.Series)
                .SelectMany(se => se.Instances)
                .Where(i => !i.IsRead)
                .ToList();
        }
    }

    public DicomInstance MarkInstanceAsRead(string sopInstanceUid, string userId)
    {
        lock (_lock)
        {
            var instance = FindInstanceUnsafe(sopInstanceUid);
            instance.IsRead = true;
            instance.ReadAt = DateTimeOffset.UtcNow;
            instance.ReadByUserId = userId;
            return instance;
        }
    }

    public DicomInstance MarkInstanceAsUnread(string sopInstanceUid)
    {
        lock (_lock)
        {
            var instance = FindInstanceUnsafe(sopInstanceUid);
            instance.IsRead = false;
            instance.ReadAt = null;
            instance.ReadByUserId = null;
            return instance;
        }
    }

    // _lock を取得済みの状態で呼ぶことを前提にした内部専用の検索処理。
    private DicomInstance FindInstanceUnsafe(string sopInstanceUid)
    {
        var instance = _studies
            .SelectMany(s => s.Series)
            .SelectMany(se => se.Instances)
            .FirstOrDefault(i => i.SopInstanceUid == sopInstanceUid);

        return instance ?? throw new ArgumentException(
            $"指定されたSOP Instance UIDの画像が見つかりません: {sopInstanceUid}");
    }
}
