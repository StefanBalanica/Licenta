namespace TheInvestigation.Api.DTOs;

/// <summary>
/// DTO for user registration
/// </summary>
public class RegisterDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
}

/// <summary>
/// DTO for user login
/// </summary>
public class LoginDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}

/// <summary>
/// DTO returned after successful authentication
/// </summary>
public class AuthResponseDto
{
    public required string Token { get; set; }
    public required UserDto User { get; set; }
}

/// <summary>
/// DTO for user information
/// </summary>
public class UserDto
{
    public int UserId { get; set; }
    public required string Email { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
}
