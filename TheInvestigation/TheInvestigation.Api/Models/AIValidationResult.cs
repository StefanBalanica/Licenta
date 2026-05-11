using System.Text.Json;

namespace TheInvestigation.Api.Models;

/// <summary>
/// Stores AI validation results for game consistency checking
/// </summary>
public class AIValidationResult
{
    public int ValidationId { get; set; }
    
    public int GameId { get; set; }
    
    public decimal ConsistencyScore { get; set; } // 0.0 to 100.0
    
    /// <summary>
    /// JSONB array of issues found by AI
    /// </summary>
    public JsonDocument Issues { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Game Game { get; set; } = null!;
}
