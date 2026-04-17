namespace MurderMystery.Api.DTOs;

/// <summary>
/// Request to generate a murder mystery game from a story using AI
/// </summary>
public class GenerateFromStoryRequest
{
    public required string Story { get; set; }
}

/// <summary>
/// Structure returned by AI (Gemini) - must match the prompt JSON schema
/// </summary>
public class GeneratedGameData
{
    public string Title { get; set; } = "Joc generat din poveste";
    public string? Description { get; set; }
    public string Story { get; set; } = string.Empty;
    public string Solution { get; set; } = string.Empty;
    public List<GeneratedCharacter> Characters { get; set; } = new();
    public List<GeneratedDevice> Devices { get; set; } = new();
}

public class GeneratedCharacter
{
    public string Name { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? Description { get; set; }
    public string? Backstory { get; set; }
    public string? Motive { get; set; }
    public string? Alibi { get; set; }
}

public class GeneratedDevice
{
    public string DeviceType { get; set; } = "iPhone"; // iPhone, Android, Laptop
    public string OwnerName { get; set; } = string.Empty;
    public string? Passcode { get; set; }   // 4 or 6 digit PIN; null = no lock screen
    public GeneratedDeviceApps? Apps { get; set; }
}

public class GeneratedDeviceApps
{
    public GeneratedMessageApp? Messages { get; set; }
    public GeneratedPhotosApp? Photos { get; set; }
    public GeneratedEmailApp? Email { get; set; }
    public GeneratedNotesApp? Notes { get; set; }
    public GeneratedFilesApp? Files { get; set; }
    public GeneratedPhoneApp? Phone { get; set; }
}

public class GeneratedFilesApp
{
    public List<GeneratedFileItem> Items { get; set; } = new();
}

public class GeneratedFileItem
{
    public string Name { get; set; } = string.Empty;       // e.g. "AzuraProject", "Screenshot cont bancar"
    public string Type { get; set; } = "Document";        // Encrypted, Screenshot, Document, Folder, Image
    public string Description { get; set; } = string.Empty; // optional detail from story
}

public class GeneratedMessageApp
{
    public List<GeneratedConversation> Conversations { get; set; } = new();
}

public class GeneratedConversation
{
    public string Contact { get; set; } = string.Empty;
    public string Avatar { get; set; } = "👤";
    public string LastMessage { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public List<GeneratedMessage> Messages { get; set; } = new();
}

public class GeneratedMessage
{
    public string Sender { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public bool IsOutgoing { get; set; }
}

public class GeneratedPhotosApp
{
    public List<GeneratedPhoto> Photos { get; set; } = new();
}

public class GeneratedPhoto
{
    public string Url { get; set; } = string.Empty; // can be placeholder or data URL
    public string Caption { get; set; } = string.Empty;
}

public class GeneratedEmailApp
{
    public List<GeneratedEmail> Emails { get; set; } = new();
    public List<GeneratedEmail> Inbox { get; set; } = new();
    public List<GeneratedEmail> Sent { get; set; } = new();
    public List<GeneratedEmail> Drafts { get; set; } = new();
}

public class GeneratedEmail
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Preview { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class GeneratedNotesApp
{
    public List<GeneratedNote> Notes { get; set; } = new();
}

public class GeneratedNote
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class GeneratedPhoneApp
{
    public List<GeneratedCall> Calls { get; set; } = new();
}

public class GeneratedCall
{
    public string Contact { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;       // e.g. "18.03.2026"
    public string Time { get; set; } = string.Empty;       // e.g. "21:00"
    public string Duration { get; set; } = string.Empty;
    public bool IsIncoming { get; set; }
    public bool Answered { get; set; }
    public string AudioUrl { get; set; } = string.Empty;   // upload-required:// placeholder or data URL
    public string AudioFileName { get; set; } = string.Empty; // e.g. "Santaj_Mirela.mp3"
    public string Type { get; set; } = string.Empty;       // "Primit" | "Efectuat" | "Pierdut"
}
