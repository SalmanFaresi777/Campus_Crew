namespace backend_Csharp.Config;

public sealed class SmtpSettings
{
    public string Host { get; set; } = "smtp.gmail.com";
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Pass { get; set; } = string.Empty;
    public string SenderName { get; set; } = "CampusCrew";
    public string SenderEmail { get; set; } = string.Empty;
}
