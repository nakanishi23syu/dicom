using DicomLearning.GraphQL.Data;
using DicomLearning.GraphQL.Models;
using HotChocolate;

namespace DicomLearning.GraphQL.GraphQL;

// ======================================================
// Query — GraphQLの「Query」ルートタイプ
// ======================================================
// 【HotChocolateのコードファースト方式とは】
// スキーマ（.graphqlファイル）を先に書く「スキーマファースト」ではなく、
// 普通のC#クラス・メソッドを書くと、そこからHotChocolateが自動でGraphQLスキーマを生成する。
// このクラスの public メソッドがそのまま GraphQL の「フィールド」になる。
//
// 例えば下の GetStudies() メソッドは、GraphQL上では次のように呼び出せる:
//   query {
//     studies {
//       studyInstanceUid
//       patientName
//       series { seriesDescription unreadCount }
//     }
//   }
// ※ HotChocolateの命名規則により、メソッド名先頭の "Get" は取り除かれ、
//   camelCase（studies）としてスキーマに公開される。
//
// [Service] 属性: このパラメータは GraphQL のクエリ引数ではなく、
// ASP.NET Core の DI コンテナから注入されることを示す。
// Program.cs で AddSingleton<InMemoryDicomRepository>() 済みのインスタンスがここに渡ってくる。
public class Query
{
    public IReadOnlyList<DicomStudy> GetStudies([Service] InMemoryDicomRepository repository) =>
        repository.GetStudies();

    public DicomSeries? GetSeries(string seriesInstanceUid, [Service] InMemoryDicomRepository repository) =>
        repository.GetSeriesByUid(seriesInstanceUid);

    // ── SYNAPSE_LEADの「タイムラインビュー」を模したクエリ ──
    // 同一患者の過去検査を新しい順に並べて返す。用語集にある「比較読影」の土台になる情報。
    // query { patientTimeline(patientId: "patient-001") { studyDate studyDescription } }
    public IReadOnlyList<DicomStudy> GetPatientTimeline(
        string patientId,
        [Service] InMemoryDicomRepository repository) =>
        repository.GetPatientTimeline(patientId);

    // ── 未読画像の一覧 ──
    // 読影医が次に見るべき画像の「読影ワークリスト」のようなイメージ。
    public IReadOnlyList<DicomInstance> GetUnreadInstances([Service] InMemoryDicomRepository repository) =>
        repository.GetUnreadInstances();
}
