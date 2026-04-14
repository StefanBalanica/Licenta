namespace MurderMystery.Api.Models;

/// <summary>
/// Represents a digital device (iPhone, Android, Laptop) accessible via QR code
/// </summary>
public class DigitalDevice
{
    public int DeviceId { get; set; }
    
    public int GameId { get; set; }
    
    public required string DeviceType { get; set; } // "iPhone", "Android", "Laptop"
    
    public required string OwnerName { get; set; }
    
    /// <summary>
    /// Unique URL for accessing this device (used in QR code)
    /// </summary>
    public required string UniqueUrl { get; set; }
    
    /// <summary>
    /// Optional PIN passcode to lock the device (null = unlocked)
    /// </summary>
    public string? Passcode { get; set; }
    
    /// <summary>
    /// Path to generated QR code image
    /// </summary>
    public string? QRCodeUrl { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public Game Game { get; set; } = null!;
    public ICollection<DeviceApp> DeviceApps { get; set; } = new List<DeviceApp>();
}
