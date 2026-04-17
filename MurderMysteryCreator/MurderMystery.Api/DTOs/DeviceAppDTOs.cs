namespace MurderMystery.Api.DTOs;

// Device App DTOs
public class DeviceAppDto
{
    public int AppId { get; set; }
    public int DeviceId { get; set; }
    public string AppType { get; set; } = string.Empty;
    public object AppData { get; set; } = new { };
    public DateTime CreatedAt { get; set; }
}

public class CreateDeviceAppDto
{
    public string AppType { get; set; } = string.Empty; // "Messages", "Photos", "Email", "Notes"
    public object AppData { get; set; } = new { };
}

public class UpdateDeviceAppDto
{
    public object? AppData { get; set; }
}

// Extended Device DTO with Apps
public class DeviceWithAppsDto
{
    public int DeviceId { get; set; }
    public int GameId { get; set; }
    public string DeviceType { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string UniqueUrl { get; set; } = string.Empty;
    public string? QRCodeUrl { get; set; }
    public string? Passcode { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<DeviceAppDto> Apps { get; set; } = new();
}


// Structured App Data Types
public class MessageAppData
{
    public List<Conversation> Conversations { get; set; } = new();
}

public class Conversation
{
    public string Contact { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public string LastMessage { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public List<Message> Messages { get; set; } = new();
}

public class Message
{
    public string Sender { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public bool IsOutgoing { get; set; }
}

public class PhotosAppData
{
    public List<Photo> Photos { get; set; } = new();
}

public class Photo
{
    public string Url { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
}

public class EmailAppData
{
    public List<Email> Emails { get; set; } = new();
    public List<Email> Inbox { get; set; } = new();
    public List<Email> Sent { get; set; } = new();
    public List<Email> Drafts { get; set; } = new();
}

public class Email
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Preview { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class NotesAppData
{
    public List<Note> Notes { get; set; } = new();
}

public class Note
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class FilesAppData
{
    public List<FileItem> Items { get; set; } = new();
}

public class FileItem
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "Document"; // Encrypted, Screenshot, Document, Folder, Image
    public string Description { get; set; } = string.Empty;
}

public class PhoneAppData
{
    public List<CallLogItem> Calls { get; set; } = new();
}

public class CallLogItem
{
    public string Contact { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;       // e.g. "18.03.2026"
    public string Time { get; set; } = string.Empty;       // e.g. "21:00"
    public string Duration { get; set; } = string.Empty;
    public bool IsIncoming { get; set; }
    public bool Answered { get; set; }
    public string Type { get; set; } = string.Empty;       // "Primit" | "Efectuat" | "Pierdut"
    public string AudioUrl { get; set; } = string.Empty;   // upload-required:// placeholder or base64 data URL
    public string AudioFileName { get; set; } = string.Empty; // e.g. "Santaj_Mirela.mp3"
}
