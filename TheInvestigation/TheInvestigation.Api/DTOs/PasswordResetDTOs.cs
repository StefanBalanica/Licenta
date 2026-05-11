namespace TheInvestigation.Api.DTOs;

/// <summary>Request body for forgot-password flow.</summary>
public class ForgotPasswordDto
{
    public required string Email { get; set; }
}

/// <summary>Request body for reset-password flow.</summary>
public class ResetPasswordDto
{
    public required string Token { get; set; }
    public required string NewPassword { get; set; }
}
