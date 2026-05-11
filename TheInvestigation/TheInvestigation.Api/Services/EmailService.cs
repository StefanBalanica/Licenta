using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace TheInvestigation.Api.Services;

/// <summary>
/// Sends transactional emails via Gmail REST API (OAuth2).
/// Uses HTTPS on port 443 - works on all hosting platforms including Render free tier.
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly IHttpClientFactory _httpFactory;

    public EmailService(IConfiguration config, ILogger<EmailService> logger, IHttpClientFactory httpFactory)
    {
        _config = config;
        _logger = logger;
        _httpFactory = httpFactory;
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink)
    {
        var s = _config.GetSection("GmailApiSettings");
        var clientId     = s["ClientId"]     ?? throw new InvalidOperationException("GmailApiSettings:ClientId not configured");
        var clientSecret = s["ClientSecret"] ?? throw new InvalidOperationException("GmailApiSettings:ClientSecret not configured");
        var refreshToken = s["RefreshToken"] ?? throw new InvalidOperationException("GmailApiSettings:RefreshToken not configured");
        var senderEmail  = s["SenderEmail"]  ?? "licenta.test.securitate.parola@gmail.com";
        var senderName   = s["SenderName"]   ?? "The Investigation";

        _logger.LogInformation("[Email] Getting Gmail access token...");
        var accessToken = await GetAccessTokenAsync(clientId, clientSecret, refreshToken);

        _logger.LogInformation("[Email] Building message for {Email}...", toEmail);
        var htmlBody = BuildResetEmailHtml(toName, resetLink);
        var rawMime  = BuildRawMime(senderName, senderEmail, toName, toEmail,
                                    "Resetare parola - The Investigation", htmlBody);

        _logger.LogInformation("[Email] Sending via Gmail API...");
        await SendViaGmailApiAsync(accessToken, rawMime, toEmail);
        _logger.LogInformation("[Email] SUCCESS - sent to {Email}", toEmail);
    }

    // ── OAuth2: exchange refresh_token for access_token ──────────────────────
    private async Task<string> GetAccessTokenAsync(string clientId, string clientSecret, string refreshToken)
    {
        var http = _httpFactory.CreateClient();
        var body = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["client_id"]     = clientId,
            ["client_secret"] = clientSecret,
            ["refresh_token"] = refreshToken,
            ["grant_type"]    = "refresh_token"
        });

        var resp = await http.PostAsync("https://oauth2.googleapis.com/token", body);
        var json = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"OAuth token error ({resp.StatusCode}): {json}");

        var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("access_token").GetString()
               ?? throw new InvalidOperationException("access_token missing from OAuth response");
    }

    // ── Gmail API: send base64url-encoded RFC-2822 message ───────────────────
    private async Task SendViaGmailApiAsync(string accessToken, string rawMime, string toEmail)
    {
        var http = _httpFactory.CreateClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // Base64url encode (no padding, URL-safe)
        var base64Url = Convert.ToBase64String(Encoding.UTF8.GetBytes(rawMime))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

        var payload = JsonSerializer.Serialize(new { raw = base64Url });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");

        var resp = await http.PostAsync(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send", content);
        var body = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gmail API error ({resp.StatusCode}): {body}");
    }

    // ── Build RFC-2822 MIME email ─────────────────────────────────────────────
    private static string BuildRawMime(
        string fromName, string fromEmail,
        string toName,   string toEmail,
        string subject,  string htmlBody)
    {
        return $"From: {fromName} <{fromEmail}>\r\n"
             + $"To: {toName} <{toEmail}>\r\n"
             + $"Subject: {subject}\r\n"
             + $"MIME-Version: 1.0\r\n"
             + $"Content-Type: text/html; charset=UTF-8\r\n"
             + $"\r\n"
             + htmlBody;
    }

    // ── HTML template ─────────────────────────────────────────────────────────
    private static string BuildResetEmailHtml(string name, string resetLink) => $"""
        <!DOCTYPE html>
        <html lang="ro">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f5f2ec;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f2ec;padding:40px 20px;">
            <tr><td align="center">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid rgba(0,0,0,0.09);overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
                <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#b87208,transparent);"></td></tr>
                <tr><td style="padding:28px 36px 0;text-align:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="72" height="72" style="display:block;margin:0 auto;">
                    <circle cx="250" cy="250" r="248" fill="white"/>
                    <circle cx="250" cy="250" r="238" fill="none" stroke="#0d0d0d" stroke-width="18"/>
                    <circle cx="250" cy="250" r="188" fill="none" stroke="#0d0d0d" stroke-width="7"/>
                    <defs>
                      <path id="a1" d="M 42,250 A 208,208 0 0,1 458,250"/>
                      <path id="a2" d="M 70,318 A 198,198 0 0,0 430,318"/>
                    </defs>
                    <text font-family="Georgia,serif" font-weight="700" font-size="37" fill="#0d0d0d" letter-spacing="4">
                      <textPath href="#a1" startOffset="50%" text-anchor="middle">THE INVESTIGATION</textPath>
                    </text>
                    <text font-family="Georgia,serif" font-weight="700" font-size="28" fill="#0d0d0d" letter-spacing="3">
                      <textPath href="#a2" startOffset="50%" text-anchor="middle">FOLLOW THE EVIDENCE</textPath>
                    </text>
                    <ellipse cx="232" cy="165" rx="72" ry="11" fill="#0d0d0d"/>
                    <path d="M 196,165 Q 194,118 213,104 Q 234,90 260,97 Q 282,105 284,140 L 284,165 Z" fill="#0d0d0d"/>
                    <path d="M 220,164 Q 268,162 285,178 Q 302,196 295,220 Q 290,240 278,250 Q 265,260 252,260 Q 235,260 224,248 Q 208,232 210,208 Q 210,183 220,164 Z" fill="#0d0d0d"/>
                    <rect x="231" y="258" width="27" height="22" fill="#0d0d0d"/>
                    <path d="M 185,390 L 212,275 Q 222,258 250,256 Q 278,258 288,275 L 318,390 Z" fill="#0d0d0d"/>
                    <circle cx="305" cy="225" r="32" fill="none" stroke="#0d0d0d" stroke-width="13"/>
                    <line x1="328" y1="248" x2="348" y2="268" stroke="#0d0d0d" stroke-width="13" stroke-linecap="round"/>
                  </svg>
                </td></tr>
                <tr><td style="padding:20px 36px 0;"><hr style="border:none;border-top:1px solid rgba(0,0,0,0.07);"></td></tr>
                <tr><td style="padding:28px 36px;">
                  <h1 style="margin:0 0 8px;font-family:'Georgia',serif;font-size:24px;font-weight:400;color:#1a1610;">Resetare parola</h1>
                  <p style="margin:0 0 20px;font-size:14px;color:rgba(26,22,16,0.55);line-height:1.6;">
                    Buna, <strong style="color:#1a1610;">{name}</strong>.<br>
                    Am primit o cerere de resetare a parolei. Apasa butonul de mai jos.
                  </p>
                  <table cellpadding="0" cellspacing="0"><tr><td>
                    <a href="{resetLink}" style="display:inline-block;padding:12px 28px;background:#1c2b4a;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">Reseteaza parola</a>
                  </td></tr></table>
                  <p style="margin:20px 0 0;font-size:12px;color:rgba(26,22,16,0.4);line-height:1.6;">
                    Link-ul este valid <strong>1 ora</strong> si poate fi folosit o singura data.<br>
                    Daca nu ai solicitat resetarea, ignora acest email.
                  </p>
                  <p style="margin:16px 0 0;font-size:11px;color:rgba(26,22,16,0.3);word-break:break-all;">
                    Sau copiaza link-ul: {resetLink}
                  </p>
                </td></tr>
                <tr><td style="padding:0 36px 28px;">
                  <hr style="border:none;border-top:1px solid rgba(0,0,0,0.07);margin-bottom:16px;">
                  <p style="margin:0;font-size:11px;color:rgba(26,22,16,0.3);">The Investigation &bull; Email trimis automat.</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
}