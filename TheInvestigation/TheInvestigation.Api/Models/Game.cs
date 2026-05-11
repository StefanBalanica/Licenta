namespace TheInvestigation.Api.Models;

/// <summary>
/// Represents a murder mystery game
/// </summary>
public class Game
{
    public int GameId { get; set; }
    
    public int UserId { get; set; }
    
    public required string Title { get; set; }
    
    public string? Description { get; set; }
    
    public string? Story { get; set; }
    
    public string? Solution { get; set; }
    
    public bool IsPublished { get; set; } = false;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<Character> Characters { get; set; } = new List<Character>();
    public ICollection<PhysicalEvidence> PhysicalEvidences { get; set; } = new List<PhysicalEvidence>();
    public ICollection<DigitalDevice> DigitalDevices { get; set; } = new List<DigitalDevice>();
    public ICollection<AIValidationResult> AIValidationResults { get; set; } = new List<AIValidationResult>();
}
