using TheInvestigation.Api.DTOs;

namespace TheInvestigation.Api.Services;

/// <summary>
/// Service interface for authentication operations
/// </summary>
public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
    Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
    string GenerateJwtToken(int userId, string email);
    Task<bool> EmailExistsAsync(string email);
    Task ForgotPasswordAsync(string email);
    Task ResetPasswordAsync(string token, string newPassword);
    Task ChangePasswordAsync(int userId, string currentPassword, string newPassword);
    Task DeleteAccountAsync(int userId);
}
