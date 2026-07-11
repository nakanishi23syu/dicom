namespace DicomLearning.GraphQL.GraphQL;

// ======================================================
// AuthPayload — ログイン成功時にMutation.Loginが返す型
// ======================================================
// AppUser自体をそのまま返さないのは、PasswordHash（ハッシュ化済みとはいえ機微情報）を
// うっかりGraphQLスキーマに公開してしまう事故を避けるため。
// 「ログイン結果として本当に必要なものだけ」を独立した型として定義している。
public sealed class AuthPayload
{
    public required string Token { get; init; }
    public required string DisplayName { get; init; }
    public required bool IsAdmin { get; init; }
}
