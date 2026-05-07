namespace MurderMystery.Api.Models;

/// <summary>
/// Stores password reset tokens (only the SHA-256 hash is persisted — never the raw token).
/// </summary>
public class PasswordResetToken
{
    public int Id { get; set; }
    public int UserId { get; set; }

    /// <summary>SHA-256 hash of the raw token sent in the email link.</summary>
    public required string TokenHash { get; set; }

    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public User? User { get; set; }
}
