namespace TheInvestigation.Api.DTOs;

// Digital Device DTOs
public class DigitalDeviceDto
{
    public int DeviceId { get; set; }
    public int GameId { get; set; }
    public string DeviceType { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string UniqueUrl { get; set; } = string.Empty;
    public string? QRCodeUrl { get; set; }
    public string? Passcode { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateDigitalDeviceDto
{
    public string DeviceType { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string? Passcode { get; set; }
}

public class UpdateDigitalDeviceDto
{
    public string? DeviceType { get; set; }
    public string? OwnerName { get; set; }
    public string? Passcode { get; set; }
}
