namespace backend_Csharp.Config;

public sealed class JwtSettings
{
    public string AccessSecret { get; set; } = "secret_ecom";
    public string RefreshSecret { get; set; } = "secret_recom";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 1;
    public string Issuer { get; set; } = "CampusCrew";
    public string Audience { get; set; } = "CampusCrew.Client";
}
