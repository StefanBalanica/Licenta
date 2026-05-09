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
        var senderName = settings["SenderName"] ?? "The Investigation";
        var senderEmail = settings["SenderEmail"] ?? smtpUser;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = "Resetare parola - The Investigation";

        message.Body = new TextPart("html")
        {
            Text = BuildResetEmailHtml(toName, resetLink)
        };

        using var client = new SmtpClient();
        // Explicit 15s timeout per operation - prevents hanging on blocked/slow ports
        client.Timeout = 15_000;

        // Global 25s deadline across all SMTP operations
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(25));

        _logger.LogInformation("SMTP connecting to {Host}:{Port}...", smtpHost, smtpPort);
        try
        {
            // Try port 587 (STARTTLS); fall back to 465 (SSL) if blocked
            try
            {
                await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, cts.Token);
                _logger.LogInformation("SMTP connected via port {Port}", smtpPort);
            }
            catch (Exception ex587) when (smtpPort == 587)
            {
                _logger.LogWarning("Port 587 failed ({Msg}), retrying on 465...", ex587.Message);
                await client.ConnectAsync(smtpHost, 465, SecureSocketOptions.SslOnConnect, cts.Token);
                _logger.LogInformation("SMTP connected via port 465");
            }

            await client.AuthenticateAsync(smtpUser, smtpPass.Replace(" ", ""), cts.Token);
            await client.SendAsync(message, cancellationToken: cts.Token);
            _logger.LogInformation("Password reset email sent to {Email}", toEmail);
        }
        catch (OperationCanceledException)
        {
            _logger.LogError("SMTP timed out for {Email} - outbound SMTP may be blocked on this host", toEmail);
            throw new InvalidOperationException("Email timeout: SMTP connection could not be established in 25 seconds.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SMTP error for {Email}: {Msg}", toEmail, ex.Message);
            throw;
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
                <tr><td style="padding:24px 36px 0;text-align:center;">
                  <img src="https://i.ibb.co/placeholder" alt="The Investigation" style="display:none"/>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="72" height="72" style="display:block;margin:0 auto;">
                    <circle cx="250" cy="250" r="248" fill="white"/>
                    <circle cx="250" cy="250" r="238" fill="none" stroke="#0d0d0d" stroke-width="18"/>
                    <circle cx="250" cy="250" r="188" fill="none" stroke="#0d0d0d" stroke-width="7"/>
                    <defs>
                      <path id="arc-top-em" d="M 42,250 A 208,208 0 0,1 458,250"/>
                      <path id="arc-bot-em" d="M 70,318 A 198,198 0 0,0 430,318"/>
                    </defs>
                    <text font-family="Georgia,serif" font-weight="700" font-size="37" fill="#0d0d0d" letter-spacing="4">
                      <textPath href="#arc-top-em" startOffset="50%" text-anchor="middle">THE INVESTIGATION</textPath>
                    </text>
                    <text font-family="Georgia,serif" font-weight="700" font-size="28" fill="#0d0d0d" letter-spacing="3">
                      <textPath href="#arc-bot-em" startOffset="50%" text-anchor="middle">FOLLOW THE EVIDENCE</textPath>
                    </text>
                    <ellipse cx="232" cy="165" rx="72" ry="11" fill="#0d0d0d"/>
                    <path d="M 196,165 Q 194,118 213,104 Q 234,90 260,97 Q 282,105 284,140 L 284,165 Z" fill="#0d0d0d"/>
                    <path d="M 220,164 Q 268,162 285,178 Q 302,196 295,220 Q 290,240 278,250 Q 265,260 252,260 Q 235,260 224,248 Q 208,232 210,208 Q 210,183 220,164 Z" fill="#0d0d0d"/>
                    <rect x="231" y="258" width="27" height="22" fill="#0d0d0d"/>
                    <path d="M 185,390 L 212,275 Q 222,258 250,256 Q 278,258 288,275 L 318,390 Z" fill="#0d0d0d"/>
                    <path d="M 245,268 L 225,308 L 250,285 Z" fill="white"/>
                    <path d="M 255,268 L 278,308 L 250,285 Z" fill="white"/>
                    <circle cx="305" cy="225" r="32" fill="none" stroke="#0d0d0d" stroke-width="13"/>
                    <line x1="328" y1="248" x2="348" y2="268" stroke="#0d0d0d" stroke-width="13" stroke-linecap="round"/>
                  </svg>
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
                  <p style="margin:0;font-size:11px;color:rgba(26,22,16,0.3);">The Investigation &bull; Acest email a fost trimis automat, nu răspunde la el.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
}
