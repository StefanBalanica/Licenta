namespace MurderMystery.Api.Services;

/// <summary>Service for sending transactional emails.</summary>
public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string toName, string resetLink);
}
