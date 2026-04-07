using backend_Csharp.Config;
using backend_Csharp.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace backend_Csharp.Services;

public sealed class JwtService(IOptions<JwtSettings> jwtOptions) : IJwtService
{
    private readonly JwtSettings _jwt = jwtOptions.Value;

    public string CreateAccessToken(User user) => CreateToken(user, _jwt.AccessSecret, TimeSpan.FromMinutes(_jwt.AccessTokenMinutes));

    public string CreateRefreshToken(User user) => CreateToken(user, _jwt.RefreshSecret, TimeSpan.FromDays(_jwt.RefreshTokenDays));

    private string CreateToken(User user, string secret, TimeSpan ttl)
    {
        var claims = new List<Claim>
        {
            new("uid", user.Id ?? string.Empty),
            new("isAdmin", user.IsAdmin.ToString().ToLowerInvariant()),
            new("isApproved", user.IsApproved.ToString().ToLowerInvariant()),
            new("isApprovedAdmin", user.IsApprovedAdmin.ToString().ToLowerInvariant())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(ttl),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
