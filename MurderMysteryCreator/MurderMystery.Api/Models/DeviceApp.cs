using System.Text.Json;

namespace MurderMystery.Api.Models;

/// <summary>
/// Represents an app on a digital device (Messages, Photos, Email, Notes, etc.)
/// </summary>
public class DeviceApp
{
    public int AppId { get; set; }
    
    public int DeviceId { get; set; }
    
    public required string AppType { get; set; } // "Messages", "Photos", "Email", "Notes", "Contacts", "Browser"
    
    /// <summary>
    /// JSONB data specific to the app type
    /// For Messages: array of conversations
    /// For Photos: array of image URLs and metadata
    /// For Email: array of email messages
    /// For Notes: array of note objects
    /// </summary>
    public JsonDocument AppData { get; set; } = null!;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public DigitalDevice DigitalDevice { get; set; } = null!;
}
