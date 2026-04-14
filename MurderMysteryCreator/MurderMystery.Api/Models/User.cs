namespace MurderMystery.Api.Models;

/// <summary>
/// Represents a registered user in the system
/// </summary>
public class User
{
    public int UserId { get; set; }
    
    public required string Email { get; set; }
    
    public required string PasswordHash { get; set; }
    
    public required string FirstName { get; set; }
    
    public required string LastName { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public ICollection<Game> Games { get; set; } = new List<Game>();
}
