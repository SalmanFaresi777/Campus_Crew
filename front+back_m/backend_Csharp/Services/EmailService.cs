using backend_Csharp.Config;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace backend_Csharp.Services;

public sealed class EmailService(IOptions<SmtpSettings> options, ILogger<EmailService> logger) : IEmailService
{
    private readonly SmtpSettings _cfg = options.Value;

    public async Task SendAsync(string toEmail, string subject, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_cfg.User) || string.IsNullOrWhiteSpace(_cfg.Pass))
        {
            logger.LogWarning("SMTP not configured. Skipping email to {Email}", toEmail);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_cfg.SenderName, string.IsNullOrWhiteSpace(_cfg.SenderEmail) ? _cfg.User : _cfg.SenderEmail));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("plain") { Text = text };

        using var client = new SmtpClient();
        await client.ConnectAsync(_cfg.Host, _cfg.Port, SecureSocketOptions.StartTls, ct);
        await client.AuthenticateAsync(_cfg.User, _cfg.Pass, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
    }
}
