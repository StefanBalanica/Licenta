using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MurderMystery.Api.Data;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Models;
using MurderMystery.Api.Repositories;

namespace MurderMystery.Api.Services;

/// <summary>
/// Service implementation for authentication operations
/// </summary>
public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IConfiguration _configuration;
    private readonly MurderMysteryDbContext _db;
    private readonly IEmailService _emailService;

    public AuthService(
        IUserRepository userRepository,
        IConfiguration configuration,
        MurderMysteryDbContext db,
        IEmailService emailService)
    {
        _userRepository = userRepository;
        _configuration = configuration;
        _db = db;
        _emailService = emailService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
    {
        // Check if email already exists
        if (await _userRepository.EmailExistsAsync(registerDto.Email))
        {
            throw new InvalidOperationException("Email already registered");
        }

        // Validate password strength before hashing
        ValidatePassword(registerDto.Password);

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);

        // Create user
        var user = new User
        {
            Email = registerDto.Email,
            PasswordHash = passwordHash,
            FirstName = registerDto.FirstName,
            LastName = registerDto.LastName
        };

        await _userRepository.AddAsync(user);

        // Generate token
        var token = GenerateJwtToken(user.UserId, user.Email);

        return new AuthResponseDto
        {
            Token = token,
            User = new UserDto
            {
                UserId = user.UserId,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName
            }
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
    {
        // Find user by email
        var user = await _userRepository.GetByEmailAsync(loginDto.Email);
        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password");
        }

        // Generate token
        var token = GenerateJwtToken(user.UserId, user.Email);

        return new AuthResponseDto
        {
            Token = token,
            User = new UserDto
            {
                UserId = user.UserId,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName
            }
        };
    }

    public string GenerateJwtToken(int userId, string email)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
        var issuer = jwtSettings["Issuer"] ?? "MurderMysteryApi";
        var audience = jwtSettings["Audience"] ?? "MurderMysteryClient";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>
    /// Validates password strength against industry-standard rules.
    /// </summary>
    private static void ValidatePassword(string password)
    {
        var errors = new List<string>();

        if (password.Length < 8)
            errors.Add("minimum 8 caractere");
        if (!password.Any(char.IsUpper))
            errors.Add("cel puțin o literă mare (A-Z)");
        if (!password.Any(char.IsLower))
            errors.Add("cel puțin o literă mică (a-z)");
        if (!password.Any(char.IsDigit))
            errors.Add("cel puțin o cifră (0-9)");
        if (!password.Any(c => "!@#$%^&*()_+-=[]{}|;':\",./<>?".Contains(c)))
            errors.Add("cel puțin un caracter special (!@#$%^&* etc.)");

        if (errors.Count > 0)
            throw new ArgumentException($"Parola trebuie să conțină: {string.Join(", ", errors)}.");
    }

    public async Task<bool> EmailExistsAsync(string email)
        => await _userRepository.EmailExistsAsync(email);

    // ── Forgot / Reset Password ─────────────────────────────────────────────────────

    public async Task ForgotPasswordAsync(string email)
    {
        // Always return silently — don't reveal whether the email is registered.
        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null) return;

        // Invalidate any previous unused tokens for this user.
        var oldTokens = await _db.PasswordResetTokens
            .Where(t => t.UserId == user.UserId && !t.IsUsed && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();
        oldTokens.ForEach(t => t.IsUsed = true);

        // Generate cryptographically secure raw token (256-bit).
        var rawBytes = RandomNumberGenerator.GetBytes(32);
        var rawToken = Convert.ToBase64String(rawBytes)
            .Replace("+", "-").Replace("/", "_").Replace("=", ""); // URL-safe Base64

        // Store only the SHA-256 hash.
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();

        _db.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.UserId,
            TokenHash = hash,
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsUsed = false
        });
        await _db.SaveChangesAsync();

        // Build reset link and send email.
        var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:4200";
        var resetLink = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";
        var fullName = $"{user.FirstName} {user.LastName}";
        await _emailService.SendPasswordResetEmailAsync(user.Email, fullName, resetLink);
    }

    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        // Hash the incoming raw token to compare with what's stored.
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();

        var resetToken = await _db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == hash);

        if (resetToken == null)
            throw new InvalidOperationException("Link invalid sau expirat.");
        if (resetToken.IsUsed)
            throw new InvalidOperationException("Link-ul a fost deja utilizat. Solicita un link nou.");
        if (resetToken.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("Link-ul a expirat. Solicita un link nou.");

        // Validate new password strength.
        ValidatePassword(newPassword);

        // Update password and mark token as used — atomically.
        resetToken.User!.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        resetToken.IsUsed = true;
        await _db.SaveChangesAsync();
    }
}
