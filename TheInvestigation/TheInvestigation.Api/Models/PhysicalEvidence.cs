using System.Text.Json;

namespace TheInvestigation.Api.Models;

/// <summary>
/// Represents physical evidence that will be printed (newspapers, police reports, documents)
/// </summary>
public class PhysicalEvidence
{
    public int EvidenceId { get; set; }
    
    public int GameId { get; set; }
    
    public required string Type { get; set; } // "Newspaper", "PoliceReport", "Document", "Letter", "Photo"
    
    public required string Title { get; set; }
    
    /// <summary>
    /// JSONB content specific to the evidence type
    /// </summary>
    public JsonDocument Content { get; set; } = null!;
    
    /// <summary>
    /// URL to uploaded file (if applicable)
    /// </summary>
    public string? FileUrl { get; set; }
    
    /// <summary>
    /// Generated PDF URL
    /// </summary>
    public string? PdfUrl { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Game Game { get; set; } = null!;
}
