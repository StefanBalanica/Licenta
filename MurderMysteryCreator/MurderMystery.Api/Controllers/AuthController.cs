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
    /// Initiates the password reset flow. Always returns 200 OK to prevent
    /// email enumeration attacks (even if the email doesn't exist).
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        try
        {
            await _authService.ForgotPasswordAsync(dto.Email);
        }
        catch (Exception ex)
        {
            // Log internally but return success to the caller.
            _logger.LogError(ex, "Error during forgot-password for {Email}", dto.Email);
        }
        return Ok(new { message = "Dacă emailul există, vei primi un link de resetare în câteva minute." });
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
