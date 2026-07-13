using DicomLearning.GraphQL.Models;
using Microsoft.EntityFrameworkCore;

namespace DicomLearning.GraphQL.Data;

// ======================================================
// DicomDbContext — EF Core の DbContext（SQLiteへの永続化を担当）
// ======================================================
// Program.cs で Scoped として DI コンテナに登録する（AddDbContext の既定ライフタイム）。
// GraphQLのリクエスト1件ごとに新しいインスタンスが払い出される。
//
// 【 (DbContextOptions<DicomDbContext> options) : DbContext(options) の意味】
// これもプライマリコンストラクタ（DicomUploadService.csの解説を参照）だが、
// 末尾に ": DbContext(options)" が付いている点が異なる。これは
// 「受け取った options を、そのまま基底クラス DbContext のコンストラクタに渡す」という意味。
// つまり通常のコンストラクタで書くと以下と同じ:
//
//   public sealed class DicomDbContext : DbContext
//   {
//       public DicomDbContext(DbContextOptions<DicomDbContext> options) : base(options) { }
//   }
//
// DbContextOptions&lt;DicomDbContext&gt; の中身（SQLiteを使う・接続文字列は何か等）は
// Program.cs の `builder.Services.AddDbContext<DicomDbContext>(options => options.UseSqlite(...))`
// で組み立てられ、DIコンテナ経由でここに渡ってくる。
public sealed class DicomDbContext(DbContextOptions<DicomDbContext> options) : DbContext(options)
{
    public DbSet<UserStudy> UserStudies => Set<UserStudy>();
    public DbSet<UserSeries> UserSeries => Set<UserSeries>();
    public DbSet<UserSop> UserSops => Set<UserSop>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── user_study ──
        modelBuilder.Entity<UserStudy>(entity =>
        {
            entity.ToTable("user_study");
            entity.HasKey(s => s.Id);

            // DICOMのStudy Instance UIDは一意なので、重複登録を防ぐためユニーク制約を付ける。
            entity.HasIndex(s => s.StudyInstanceUid).IsUnique();

            // 患者IDでの検索、検査日での並べ替え・絞り込みが頻出するためindexを貼る。
            entity.HasIndex(s => s.PatientId);
            entity.HasIndex(s => s.StudyDate);

            // 「患者のタイムラインビュー（同一患者を検査日順に並べる）」用の複合index。
            entity.HasIndex(s => new { s.PatientId, s.StudyDate });

            // Accession Number（RIS/PACS横断の検査識別キー）での検索用。
            entity.HasIndex(s => s.AccessionNumber);

            // 「並べ替え適用」時に ORDER BY Order で並べ替えるためのindex。
            entity.HasIndex(s => s.Order);

            entity.HasMany(s => s.Series)
                .WithOne(se => se.Study)
                .HasForeignKey(se => se.UserStudyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── user_series ──
        modelBuilder.Entity<UserSeries>(entity =>
        {
            entity.ToTable("user_series");
            entity.HasKey(se => se.Id);
            entity.HasIndex(se => se.SeriesInstanceUid).IsUnique();
            entity.HasIndex(se => se.Order);
            // UserStudyId（外部キー）にはEF Coreの規約により自動でindexが貼られる。

            entity.HasMany(se => se.Sops)
                .WithOne(sop => sop.Series)
                .HasForeignKey(sop => sop.UserSeriesId)
                .OnDelete(DeleteBehavior.Cascade);

            // UnreadCountはSops件数から計算する読み取り専用プロパティなのでDBカラムにはしない。
            entity.Ignore(se => se.UnreadCount);
        });

        // ── user_sop ──
        modelBuilder.Entity<UserSop>(entity =>
        {
            entity.ToTable("user_sop");
            entity.HasKey(sop => sop.Id);
            entity.HasIndex(sop => sop.SopInstanceUid).IsUnique();

            // 「未読一覧（読影ワークリスト）」の絞り込みで使うためindexを貼る。
            entity.HasIndex(sop => sop.IsRead);
            entity.HasIndex(sop => sop.Order);
            // UserSeriesId（外部キー）にはEF Coreの規約により自動でindexが貼られる。
        });

        // ── app_user ──
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_user");
            entity.HasKey(u => u.Id);

            // ログインIDでの検索（認証時）のため一意制約 + index。
            entity.HasIndex(u => u.Username).IsUnique();
        });
    }
}
