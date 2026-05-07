using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace MurderMystery.Api.Services;

/// <summary>
/// Sends transactional emails via Gmail SMTP using MailKit.
/// Credentials are loaded from EmailSettings (user-secrets / environment variables).
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink)
    {
        var settings = _config.GetSection("EmailSettings");
        var smtpHost = settings["SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(settings["SmtpPort"] ?? "587");
        var smtpUser = settings["SmtpUser"] ?? throw new InvalidOperationException("EmailSettings:SmtpUser not configured");
        var smtpPass = settings["SmtpPass"] ?? throw new InvalidOperationException("EmailSettings:SmtpPass not configured");
        var senderName = settings["SenderName"] ?? "Murder Mystery";
        var senderEmail = settings["SenderEmail"] ?? smtpUser;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Resetare parolă — Murder Mystery Creator";

        message.Body = new TextPart("html")
        {
            Text = BuildResetEmailHtml(toName, resetLink)
        };

        using var client = new SmtpClient();
        try
        {
            await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);
            // Gmail App Passwords work with or without spaces — strip to be safe
            await client.AuthenticateAsync(smtpUser, smtpPass.Replace(" ", ""));
            await client.SendAsync(message);
            _logger.LogInformation("Password reset email sent to {Email}", toEmail);
        }
        finally
        {
            await client.DisconnectAsync(true);
        }
    }

    private static string BuildResetEmailHtml(string name, string resetLink) => $"""
        <!DOCTYPE html>
        <html lang="ro">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f5f2ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.09);overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
                <!-- Header bar -->
                <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#b87208,transparent);"></td></tr>
                <!-- Logo -->
                <tr><td style="padding:32px 36px 0;">
                  <p style="margin:0;font-family:'Georgia',serif;font-size:16px;font-weight:700;color:#1a1610;letter-spacing:0.5px;">Murder Mystery</p>
                  <p style="margin:2px 0 0;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:rgba(26,22,16,0.3);">CREATOR PLATFORM</p>
                </td></tr>
                <!-- Divider -->
                <tr><td style="padding:20px 36px 0;"><hr style="border:none;border-top:1px solid rgba(0,0,0,0.07);"></td></tr>
                <!-- Content -->
                <tr><td style="padding:28px 36px;">
                  <h1 style="margin:0 0 8px;font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#1a1610;">Resetare parolă</h1>
                  <p style="margin:0 0 20px;font-size:14px;color:rgba(26,22,16,0.55);line-height:1.6;">
                    Bună, <strong style="color:#1a1610;">{name}</strong>.<br>
                    Am primit o cerere de resetare a parolei pentru contul tău. Apasă butonul de mai jos pentru a seta o parolă nouă.
                  </p>
                  <table cellpadding="0" cellspacing="0"><tr><td>
                    <a href="{resetLink}" style="display:inline-block;padding:12px 28px;background:#1c2b4a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;letter-spacing:0.3px;">Resetează parola</a>
                  </td></tr></table>
                  <p style="margin:20px 0 0;font-size:12px;color:rgba(26,22,16,0.4);line-height:1.6;">
                    Link-ul este valid <strong>1 oră</strong> și poate fi folosit o singură dată.<br>
                    Dacă nu ai solicitat resetarea parolei, ignoră acest email — contul tău este în siguranță.
                  </p>
                  <p style="margin:16px 0 0;font-size:11px;color:rgba(26,22,16,0.3);word-break:break-all;">
                    Sau copiază link-ul: {resetLink}
                  </p>
                </td></tr>
                <!-- Footer -->
                <tr><td style="padding:0 36px 28px;">
                  <hr style="border:none;border-top:1px solid rgba(0,0,0,0.07);margin-bottom:16px;">
                  <p style="margin:0;font-size:11px;color:rgba(26,22,16,0.3);">Murder Mystery Creator &bull; Acest email a fost trimis automat, nu răspunde la el.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
}
