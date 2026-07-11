namespace DicomLearning.GraphQL.Models;

// ======================================================
// AppUser — ログインするユーザー（読影医）を表すエンティティ（テーブル: app_user）
// ======================================================
// 追加指示書にある「医者が最初にログインすると、管理者アカウントなら、できることが増える」に対応する
// 最小限のユーザーモデル。ロールをテーブルで分けるほどの複雑さは不要なため、
// IsAdmin フラグ1つで「一般の読影医」と「管理者」を区別している。
//
// パスワードは平文で保存せず、PasswordHasher<AppUser>（Services/AuthService.cs参照）でハッシュ化する。
public sealed class AppUser
{
    public int Id { get; set; }

    // ログインID。GraphQL側には公開するが、PasswordHashは公開しない（Query/Mutationの戻り値の型に含めない）。
    public required string Username { get; init; }

    public required string PasswordHash { get; set; }

    public string DisplayName { get; init; } = "";

    // true: 管理者（並べ替え保存など、より多くの操作が許可される）
    public bool IsAdmin { get; init; }
}
