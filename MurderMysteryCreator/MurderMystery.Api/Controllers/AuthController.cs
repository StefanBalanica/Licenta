using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Services;

namespace MurderMystery.Api.Controllers;

/// <summary>
/// Controller for authentication operations (register, login)
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _logger = logger;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
    {
        try
        {
            var response = await _authService.RegisterAsync(registerDto);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Registration failed — password validation: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)

        {
            _logger.LogWarning(ex, "Registration failed: {Message}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during registration");
            return StatusCode(500, new { message = "An error occurred during registration" });
        }
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
    {
        try
        {
            var response = await _authService.LoginAsync(loginDto);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Login failed: {Message}", ex.Message);
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during login");
            return StatusCode(500, new { message = "An error occurred during login" });
        }
    }

    /// <summary>
    /// Checks whether an email address is already registered.
    /// Used by the frontend registration form for real-time validation.
    /// </summary>
    [HttpGet("check-email")]
    public async Task<ActionResult<object>> CheckEmail([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email is required" });

        var exists = await _authService.EmailExistsAsync(email);
        return Ok(new { exists });
    }

    /// <summary>
    /// Initiates the password reset flow.
    /// Returns detailed error info for debugging SMTP issues.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        try
        {
            _logger.LogInformation("[ForgotPassword] START for {Email}", dto.Email);
            await _authService.ForgotPasswordAsync(dto.Email);
            _logger.LogInformation("[ForgotPassword] SUCCESS for {Email}", dto.Email);
            return Ok(new { message = "Email trimis cu succes." });
        }
        catch (InvalidOperationException ex)
        {
            // Config errors (SmtpUser not set) or SMTP timeout
            _logger.LogError(ex, "[ForgotPassword] CONFIG/TIMEOUT error for {Email}: {Msg}", dto.Email, ex.Message);
            return StatusCode(503, new
            {
                message = $"Eroare serviciu email: {ex.Message}",
                errorType = "ServiceError",
                detail = ex.Message
            });
        }
        catch (MailKit.Net.Smtp.SmtpCommandException ex)
        {
            // SMTP auth failure, bad credentials etc.
            _logger.LogError(ex, "[ForgotPassword] SMTP command error: {StatusCode} {Msg}", ex.StatusCode, ex.Message);
            return StatusCode(502, new
            {
                message = $"Eroare SMTP ({ex.StatusCode}): {ex.Message}",
                errorType = "SmtpCommandError",
                detail = ex.Message
            });
        }
        catch (MailKit.Net.Smtp.SmtpProtocolException ex)
        {
            _logger.LogError(ex, "[ForgotPassword] SMTP protocol error: {Msg}", ex.Message);
            return StatusCode(502, new
            {
                message = $"Eroare protocol SMTP: {ex.Message}",
                errorType = "SmtpProtocolError",
                detail = ex.Message
            });
        }
        catch (System.Net.Sockets.SocketException ex)
        {
            // Port blocked / DNS failure / network unreachable
            _logger.LogError(ex, "[ForgotPassword] Socket/network error (port blocked?): {Code} {Msg}", ex.SocketErrorCode, ex.Message);
            return StatusCode(502, new
            {
                message = $"Eroare retea SMTP (port blocat?): [{ex.SocketErrorCode}] {ex.Message}",
                errorType = "NetworkError",
                detail = ex.Message
            });
        }
        catch (OperationCanceledException ex)
        {
            _logger.LogError(ex, "[ForgotPassword] SMTP timeout for {Email}", dto.Email);
            return StatusCode(504, new
            {
                message = "Timeout SMTP: conexiunea la Gmail a depasit 25 de secunde. Portul poate fi blocat de host.",
                errorType = "Timeout",
                detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ForgotPassword] UNEXPECTED error for {Email}: {Type} {Msg}", dto.Email, ex.GetType().Name, ex.Message);
            return StatusCode(500, new
            {
                message = $"Eroare neasteptata ({ex.GetType().Name}): {ex.Message}",
                errorType = ex.GetType().Name,
                detail = ex.InnerException?.Message ?? ex.Message
            });
        }
    }

    /// <summary>
    /// Validates the reset token and sets the new password.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            await _authService.ResetPasswordAsync(dto.Token, dto.NewPassword);
            return Ok(new { message = "Parola a fost actualizată cu succes." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during reset-password");
            return StatusCode(500, new { message = "A apărut o eroare. Încearcă din nou." });
        }
    }

    /// <summary>Changes password for the currently authenticated user.</summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        try
        {
            await _authService.ChangePasswordAsync(userId.Value, dto.CurrentPassword, dto.NewPassword);
            return Ok(new { message = "Parola a fost actualizată." });
        }
        catch (ArgumentException ex)   { return BadRequest(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during change-password for user {UserId}", userId);
            return StatusCode(500, new { message = "A apărut o eroare." });
        }
    }

    /// <summary>Permanently deletes the authenticated user's account and all associated data.</summary>
    [Authorize]
    [HttpDelete("account")]
    public async Task<ActionResult> DeleteAccount()
    {
        var userId = GetCurrentUserId();
        if (userId == null) return Unauthorized();
        try
        {
            await _authService.DeleteAccountAsync(userId.Value);
            return Ok(new { message = "Contul a fost șters." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during delete-account for user {UserId}", userId);
            return StatusCode(500, new { message = "A apărut o eroare." });
        }
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim != null && int.TryParse(claim.Value, out var id) ? id : null;
    }
}
