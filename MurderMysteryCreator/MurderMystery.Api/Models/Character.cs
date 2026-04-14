namespace MurderMystery.Api.Models;

/// <summary>
/// Represents a character in a murder mystery game
/// </summary>
public class Character
{
    public int CharacterId { get; set; }
    
    public int GameId { get; set; }
    
    public required string Name { get; set; }
    
    public string? Role { get; set; }
    
    public string? Description { get; set; }
    
    public string? Backstory { get; set; }
    
    public string? Motive { get; set; }
    
    public string? Alibi { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Game Game { get; set; } = null!;
}
