using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DicomLearning.GraphQL.Configuration;
using DicomLearning.GraphQL.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DicomLearning.GraphQL.Services;

// ======================================================
// AuthService — パスワードのハッシュ化/照合 と JWT発行を担当する
// ======================================================
// 【なぜここに集約するか】
// パスワードの扱い（ハッシュ化・照合）とトークンの発行ロジックは、
// Mutation.cs に直接書くと肥大化しテストもしづらい。
// 「認証」という1つの関心事としてこのクラスにまとめている。
public sealed class AuthService(IOptions<JwtOptions> jwtOptions)
{
    // PasswordHasher<T> はASP.NET Coreに同梱されているハッシュ化ユーティリティ
    // （PBKDF2ベース、ソルト自動生成）。TはHash対象に紐づく型を渡すだけで、
    // 実際にはAppUserの中身は参照しない（型引数は用途を表すマーカー的な役割）。
    private readonly PasswordHasher<AppUser> _passwordHasher = new();

    public string HashPassword(string plainPassword) =>
        _passwordHasher.HashPassword(default!, plainPassword);

    public bool VerifyPassword(AppUser user, string plainPassword) =>
        _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, plainPassword)
            != PasswordVerificationResult.Failed;

    // ======================================================
    // GenerateToken — ログイン成功時にJWTを発行する
    // ======================================================
    // クレーム（Claims）にユーザー名と管理者フラグを積んでおくと、
    // Mutation側の [Authorize(Roles = "Admin")] 等でトークンの中身だけで認可判定できる
    // （リクエストのたびにDBへ管理者かどうか問い合わせなくて済む）。
    public string GenerateToken(AppUser user)
    {
        var options = jwtOptions.Value;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Username),
            new("displayName", user.DisplayName),
        };
        if (user.IsAdmin)
        {
            // ASP.NET Coreの[Authorize(Roles = "Admin")]はClaimTypes.Roleクレームを見る規約。
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
        }

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(options.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
