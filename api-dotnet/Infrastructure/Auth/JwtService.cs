using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BlogApi.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BlogApi.Auth;

public sealed class JwtService
{
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(2);

    private readonly JwtOptions _options;

    public JwtService(IOptions<JwtOptions> options) => _options = options.Value;

    public string Issue(string username, string role)
    {
        if (string.IsNullOrEmpty(_options.Secret))
        {
            throw new InvalidOperationException("JWT_SECRET is not configured");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: new[]
            {
                new Claim(UserClaimsAccessor.UsernameClaim, username),
                new Claim(UserClaimsAccessor.RoleClaim, role),
            },
            expires: DateTime.UtcNow.Add(TokenLifetime),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public TokenValidationParameters CreateValidationParameters() => new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret)),
        ClockSkew = TimeSpan.FromSeconds(30),
    };
}
