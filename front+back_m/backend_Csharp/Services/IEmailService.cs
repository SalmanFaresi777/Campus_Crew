namespace backend_Csharp.Services;

public interface IEmailService
{
    Task SendAsync(string toEmail, string subject, string text, CancellationToken ct = default);
}
