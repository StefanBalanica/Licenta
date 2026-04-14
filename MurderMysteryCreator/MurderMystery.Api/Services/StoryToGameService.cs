using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using MurderMystery.Api.DTOs;

namespace MurderMystery.Api.Services;

/// <summary>
/// Extracts game structure from a story using Groq (free tier, Llama models).
/// Configure GroqSettings:ApiKey and GroqSettings:Model in appsettings. Key: https://console.groq.com
/// </summary>
public class StoryToGameService : IStoryToGameService
{
    private const string DefaultGroqModel = "llama-3.3-70b-versatile";
    private static int _apiKeyIndex = 0;

    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<StoryToGameService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public StoryToGameService(IConfiguration configuration, HttpClient httpClient, ILogger<StoryToGameService> logger)
    {
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<GeneratedGameData> GenerateFromStoryAsync(string story, CancellationToken cancellationToken = default)
    {
        // 1. Extragere Metadata + Caractere + Lista Dispozitive
        var metadataPrompt = BuildMetadataPrompt(story);
        var (metaText, _) = await CallGroqAsync(metadataPrompt, cancellationToken);

        if (string.IsNullOrWhiteSpace(metaText))
            throw new InvalidOperationException("AI nu a returnat structura principală a poveștii.");

        metaText = ExtractJsonFromResponse(metaText);
        var result = BuildFromRawJson(metaText) ?? JsonSerializer.Deserialize<GeneratedGameData>(metaText, JsonOptions);
        if (result == null) throw new InvalidOperationException("Răspunsul AI nu a putut fi interpretat ca JSON valid.");

        result.Title = string.IsNullOrWhiteSpace(result.Title) ? "Joc generat din poveste" : result.Title;
        result.Story = string.IsNullOrWhiteSpace(result.Story) ? story : result.Story;
        result.Solution = string.IsNullOrWhiteSpace(result.Solution) ? "(Soluția va fi completată de tine)" : result.Solution;
        result.Devices ??= new List<GeneratedDevice>();
        result.Characters ??= new List<GeneratedCharacter>();

        // Remove empty/nameless characters and devices that AI may have generated as placeholders
        result.Characters.RemoveAll(c => string.IsNullOrWhiteSpace(c.Name));
        result.Devices.RemoveAll(d => string.IsNullOrWhiteSpace(d.OwnerName));

        _logger.LogInformation("Metadata: {Title} | {CharCount} characters | {DevCount} devices",
            result.Title, result.Characters.Count, result.Devices.Count);

        // 2. Map-Reduce pentru popularea fiecărui Dispozitiv
        var keysCount = _configuration.GetSection("GroqSettings:ApiKeys").Get<string[]>()?.Length ?? 1;
        var maxDegreeOfParallelism = Math.Max(1, keysCount);
        var semaphore = new SemaphoreSlim(maxDegreeOfParallelism);

        var deviceTasks = result.Devices.Select(async device =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var devicePrompt = BuildSingleDevicePrompt(story, device.DeviceType, device.OwnerName);
                var (devText, _) = await CallGroqAsync(devicePrompt, cancellationToken);
                
                if (!string.IsNullOrWhiteSpace(devText))
                {
                    _logger.LogInformation("Raw AI device response [{Owner}/{Type}] (first 1500 chars): {Preview}",
                        device.OwnerName, device.DeviceType, devText.Length > 1500 ? devText[..1500] + "..." : devText);
                    devText = ExtractJsonFromResponse(devText);
                    try 
                    {
                        using var doc = JsonDocument.Parse(devText);
                        device.Apps = ParseDeviceApps(doc.RootElement);
                        _logger.LogInformation("Parsed apps for {Owner}/{Type}: msgs={M} emails={E} notes={N} files={F} calls={P}",
                            device.OwnerName, device.DeviceType,
                            device.Apps?.Messages?.Conversations?.Count ?? 0,
                            (device.Apps?.Email?.Inbox?.Count ?? 0) + (device.Apps?.Email?.Sent?.Count ?? 0) + (device.Apps?.Email?.Emails?.Count ?? 0),
                            device.Apps?.Notes?.Notes?.Count ?? 0,
                            device.Apps?.Files?.Items?.Count ?? 0,
                            device.Apps?.Phone?.Calls?.Count ?? 0);
                    }
                    catch (Exception ex)
                    {
                        // Failure on one device apps parsing doesn't crash the entire generation
                        _logger.LogWarning(ex, "Failed to parse apps JSON for {Owner}", device.OwnerName);
                    }
                }
                else
                {
                    _logger.LogWarning("Empty response from Groq for device {Owner}/{Type}", device.OwnerName, device.DeviceType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Eroare la extragerea dispozitivului {Owner}", device.OwnerName);
            }
            finally
            {
                semaphore.Release();
            }
        });

        await Task.WhenAll(deviceTasks);

        return result;
    }

    /// <summary>
    /// Build GeneratedGameData by walking raw JSON with case-insensitive keys. Ensures ALL devices and their Apps (messages, photos, emails, notes) are extracted.
    /// </summary>
    private static GeneratedGameData? BuildFromRawJson(string rawJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;
            var result = new GeneratedGameData
            {
                Title = GetString(root, "Title") ?? "",
                Description = GetString(root, "Description") ?? "",
                Story = GetString(root, "Story") ?? "",
                Solution = GetString(root, "Solution") ?? "",
                Characters = ParseCharacters(root),
                Devices = ParseDevices(root)
            };
            return result;
        }
        catch
        {
            return null;
        }
    }

    private static string? GetString(JsonElement el, string name)
    {
        if (!TryGetProperty(el, name, out var v)) return null;
        return v.GetString();
    }

    private static List<GeneratedCharacter> ParseCharacters(JsonElement root)
    {
        var list = new List<GeneratedCharacter>();
        if (!TryGetProperty(root, "Characters", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return list;

        // Walk each element individually — avoids silent failure caused by 'required' on Name
        // when the entire-list deserialize throws and we lose everything.
        for (var i = 0; i < arr.GetArrayLength(); i++)
        {
            try
            {
                var el = arr[i];
                var name = GetString(el, "Name");
                if (string.IsNullOrWhiteSpace(name))
                    continue; // skip nameless entries

                list.Add(new GeneratedCharacter
                {
                    Name        = name,
                    Role        = GetString(el, "Role"),
                    Description = GetString(el, "Description"),
                    Backstory   = GetString(el, "Backstory"),
                    Motive      = GetString(el, "Motive"),
                    Alibi       = GetString(el, "Alibi")
                });
            }
            catch
            {
                // skip malformed individual element, keep going
            }
        }
        return list;
    }

    private static List<GeneratedDevice> ParseDevices(JsonElement root)
    {
        var list = new List<GeneratedDevice>();
        if (!TryGetProperty(root, "Devices", out var devicesArr) || devicesArr.ValueKind != JsonValueKind.Array)
            return list;
        for (var i = 0; i < devicesArr.GetArrayLength(); i++)
        {
            var devEl = devicesArr[i];
            var device = new GeneratedDevice
            {
                DeviceType = GetString(devEl, "DeviceType") ?? "iPhone",
                OwnerName = GetString(devEl, "OwnerName") ?? "",
                Passcode = GetString(devEl, "Passcode"),
                Apps = ParseDeviceApps(devEl)
            };
            list.Add(device);
        }
        return list;
    }

    private static GeneratedDeviceApps ParseDeviceApps(JsonElement devEl)
    {
        var appsEl = TryGetProperty(devEl, "Apps", out var innerApps) ? innerApps : devEl;
        var apps = new GeneratedDeviceApps();

        // ── Messages ─────────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var messagesEl, "Messages", "Message", "Chats", "Chat", "Texts", "TextMessages"))
        {
            try
            {
                List<GeneratedConversation>? conversations = null;
                if (messagesEl.ValueKind == JsonValueKind.Array)
                {
                    // AI returned Messages as a direct array of conversations (no wrapper)
                    conversations = JsonSerializer.Deserialize<List<GeneratedConversation>>(messagesEl.GetRawText(), JsonOptions);
                }
                else if (TryGetAnyProperty(messagesEl, out var convEl, "Conversations", "Conversation", "Chats", "Messages", "Threads") && convEl.ValueKind == JsonValueKind.Array)
                {
                    conversations = JsonSerializer.Deserialize<List<GeneratedConversation>>(convEl.GetRawText(), JsonOptions);
                }
                apps.Messages = new GeneratedMessageApp { Conversations = conversations ?? new List<GeneratedConversation>() };
            }
            catch { apps.Messages = new GeneratedMessageApp(); }
        }
        else
            apps.Messages = new GeneratedMessageApp();

        // ── Photos ───────────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var photosEl, "Photos", "Gallery", "Images"))
        {
            try
            {
                List<GeneratedPhoto>? photos = null;
                if (photosEl.ValueKind == JsonValueKind.Array)
                {
                    // AI returned Photos as a direct array
                    photos = JsonSerializer.Deserialize<List<GeneratedPhoto>>(photosEl.GetRawText(), JsonOptions);
                }
                else if (TryGetAnyProperty(photosEl, out var photosArr, "Photos", "Images", "Items") && photosArr.ValueKind == JsonValueKind.Array)
                {
                    photos = JsonSerializer.Deserialize<List<GeneratedPhoto>>(photosArr.GetRawText(), JsonOptions);
                }
                apps.Photos = new GeneratedPhotosApp { Photos = photos ?? new List<GeneratedPhoto>() };
            }
            catch { apps.Photos = new GeneratedPhotosApp(); }
        }
        else
            apps.Photos = new GeneratedPhotosApp();

        // ── Email ────────────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var emailEl, "Email", "Emails", "Mail", "Mails"))
        {
            var emailApp = new GeneratedEmailApp();
            // Support both flat array and structured {Inbox, Sent, Drafts} formats
            if (emailEl.ValueKind == JsonValueKind.Array)
            {
                try { emailApp.Emails = JsonSerializer.Deserialize<List<GeneratedEmail>>(emailEl.GetRawText(), JsonOptions) ?? new(); } catch { }
            }
            else
            {
                if (TryGetAnyProperty(emailEl, out var inboxEl, "Inbox", "Received", "Incoming") && inboxEl.ValueKind == JsonValueKind.Array)
                    try { emailApp.Inbox = JsonSerializer.Deserialize<List<GeneratedEmail>>(inboxEl.GetRawText(), JsonOptions) ?? new(); } catch { }
                if (TryGetAnyProperty(emailEl, out var sentEl, "Sent", "Outgoing") && sentEl.ValueKind == JsonValueKind.Array)
                    try { emailApp.Sent = JsonSerializer.Deserialize<List<GeneratedEmail>>(sentEl.GetRawText(), JsonOptions) ?? new(); } catch { }
                if (TryGetAnyProperty(emailEl, out var draftsEl, "Drafts", "Draft") && draftsEl.ValueKind == JsonValueKind.Array)
                    try { emailApp.Drafts = JsonSerializer.Deserialize<List<GeneratedEmail>>(draftsEl.GetRawText(), JsonOptions) ?? new(); } catch { }
                if (TryGetAnyProperty(emailEl, out var emailsArr, "Emails", "Items", "Messages") && emailsArr.ValueKind == JsonValueKind.Array)
                    try { emailApp.Emails = JsonSerializer.Deserialize<List<GeneratedEmail>>(emailsArr.GetRawText(), JsonOptions) ?? new(); } catch { }
            }
            apps.Email = emailApp;
        }
        else
            apps.Email = new GeneratedEmailApp();

        // ── Notes ────────────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var notesEl, "Notes", "Note", "Memos"))
        {
            try
            {
                List<GeneratedNote>? notes = null;
                if (notesEl.ValueKind == JsonValueKind.Array)
                {
                    notes = JsonSerializer.Deserialize<List<GeneratedNote>>(notesEl.GetRawText(), JsonOptions);
                }
                else if (TryGetAnyProperty(notesEl, out var notesArr, "Notes", "Items", "Memos") && notesArr.ValueKind == JsonValueKind.Array)
                {
                    notes = JsonSerializer.Deserialize<List<GeneratedNote>>(notesArr.GetRawText(), JsonOptions);
                }
                apps.Notes = new GeneratedNotesApp { Notes = notes ?? new List<GeneratedNote>() };
            }
            catch { apps.Notes = new GeneratedNotesApp(); }
        }
        else
            apps.Notes = new GeneratedNotesApp();

        // ── Files ────────────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var filesEl, "Files", "Documents", "Docs"))
        {
            try
            {
                List<GeneratedFileItem>? items = null;
                if (filesEl.ValueKind == JsonValueKind.Array)
                {
                    items = JsonSerializer.Deserialize<List<GeneratedFileItem>>(filesEl.GetRawText(), JsonOptions);
                }
                else if (TryGetAnyProperty(filesEl, out var itemsArr, "Items", "Files", "Documents") && itemsArr.ValueKind == JsonValueKind.Array)
                {
                    items = JsonSerializer.Deserialize<List<GeneratedFileItem>>(itemsArr.GetRawText(), JsonOptions);
                }
                apps.Files = new GeneratedFilesApp { Items = items ?? new List<GeneratedFileItem>() };
            }
            catch { apps.Files = new GeneratedFilesApp(); }
        }
        else
            apps.Files = new GeneratedFilesApp();

        // ── Phone calls ──────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var phoneEl, "Phone", "Calls", "CallLog", "CallHistory"))
        {
            try
            {
                List<GeneratedCall>? calls = null;
                if (phoneEl.ValueKind == JsonValueKind.Array)
                {
                    calls = JsonSerializer.Deserialize<List<GeneratedCall>>(phoneEl.GetRawText(), JsonOptions);
                }
                else if (TryGetAnyProperty(phoneEl, out var callsEl, "Calls", "Items", "History") && callsEl.ValueKind == JsonValueKind.Array)
                {
                    calls = JsonSerializer.Deserialize<List<GeneratedCall>>(callsEl.GetRawText(), JsonOptions);
                }
                apps.Phone = new GeneratedPhoneApp { Calls = calls ?? new List<GeneratedCall>() };
            }
            catch { apps.Phone = new GeneratedPhoneApp(); }
        }
        else
            apps.Phone = new GeneratedPhoneApp();

        return apps;
    }

    private string GetNextApiKey()
    {
        var keys = _configuration.GetSection("GroqSettings:ApiKeys").Get<string[]>();
        if (keys != null && keys.Length > 0)
        {
            var i = Interlocked.Increment(ref _apiKeyIndex);
            // Use (uint) cast to avoid Math.Abs(int.MinValue) OverflowException
            var k = keys[(uint)i % keys.Length];
            if (!string.IsNullOrWhiteSpace(k)) return k;
        }
        var singleKey = _configuration["GroqSettings:ApiKey"];
        if (!string.IsNullOrWhiteSpace(singleKey))
            return singleKey;
            
        throw new InvalidOperationException("Groq API keys missing in appsettings.");
    }

    private async Task<(string? text, bool quotaOrRateLimit)> CallGroqAsync(string prompt, CancellationToken ct)
    {
        var apiKey = GetNextApiKey();
        var model = _configuration["GroqSettings:Model"] ?? DefaultGroqModel;
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Add("Authorization", "Bearer " + apiKey);

        var body = new
        {
            model,
            messages = new[] { new { role = "user", content = prompt } },
            temperature = 0.4,
            max_tokens = 5000,
            response_format = new { type = "json_object" }
        };
        request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request, ct);
        var responseJson = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            var errMsg = GetErrorMessage(responseJson, (int)response.StatusCode, response.ReasonPhrase ?? "");
            _logger.LogWarning("Groq API error: {Msg}", errMsg);
            throw new InvalidOperationException(errMsg);
        }

        var doc = JsonDocument.Parse(responseJson);
        string? text = null;
        if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
        {
            var first = choices[0];
            if (first.TryGetProperty("message", out var msg) && msg.TryGetProperty("content", out var content))
                text = content.GetString();
        }
        return (text, false);
    }

    private static string GetErrorMessage(string responseJson, int statusCode, string reasonPhrase)
    {
        try
        {
            var doc = JsonDocument.Parse(responseJson);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                if (err.TryGetProperty("message", out var msg))
                    return msg.GetString() ?? $"{statusCode} {reasonPhrase}";
                if (err.TryGetProperty("error", out var nested))
                    return nested.GetProperty("message").GetString() ?? $"{statusCode} {reasonPhrase}";
            }
        }
        catch { }
        return $"{statusCode} {reasonPhrase}";
    }

    private static string BuildMetadataPrompt(string story)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a data extractor for a murder mystery game.");
        sb.AppendLine("TASK: Extract metadata, characters, and a barebones list of devices.");
        sb.AppendLine("CRITICAL: Output ONLY raw JSON.");
        sb.AppendLine();
        sb.AppendLine("=== EXTRACTION RULES ===");
        sb.AppendLine("[CHARACTERS]");
        sb.AppendLine("- Extract every distinct character. Role, Description, Backstory, Motive, and Alibi.");
        sb.AppendLine("[DEVICES]");
        sb.AppendLine("- Identify ALL devices. Set DeviceType (iPhone/Android/Laptop), OwnerName, and Passcode.");
        sb.AppendLine("- DO NOT extract Apps or contents here. Just identify the physical devices.");
        sb.AppendLine();
        sb.AppendLine("=== USER TEXT ===");
        sb.AppendLine(story.Trim());
        sb.AppendLine();
        sb.AppendLine("=== SCHEMA ===");
        sb.AppendLine("""
{
  "Title": "", "Description": "", "Story": "", "Solution": "",
  "Characters": [ { "Name": "", "Role": "", "Description": "", "Backstory": "", "Motive": "", "Alibi": "" } ],
  "Devices": [ { "DeviceType": "iPhone", "OwnerName": "", "Passcode": null } ]
}
""");
        return sb.ToString();
    }

    private static string BuildSingleDevicePrompt(string story, string deviceType, string ownerName)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"TASK: Extract ALL digital content from the {deviceType} owned by {ownerName}.");
        sb.AppendLine("CRITICAL: Output ONLY valid JSON. Follow the SCHEMA exactly. Do NOT omit any field.");
        sb.AppendLine($"FOCUS: Only extract data that belongs to {ownerName}'s {deviceType}. Ignore other characters' data.");
        sb.AppendLine();
        sb.AppendLine("=== RULES ===");
        sb.AppendLine($"- Messages.Conversations: list every conversation {ownerName} had. Sender=contact name if incoming, Sender={ownerName} if outgoing.");
        sb.AppendLine("- Email.Inbox: emails received. Email.Sent: emails sent. Email.Drafts: unsent drafts.");
        sb.AppendLine("- Phone.Calls: call log with Contact, Time, Duration, IsIncoming (true=received), Answered.");
        sb.AppendLine("- Notes.Notes: any notes or memos found on the device.");
        sb.AppendLine("- Files.Items: any files/documents found. Type=Document|Encrypted|Screenshot|Folder|Image.");
        sb.AppendLine("- If a section has NO data, return an empty array [] for it. NEVER omit a key.");
        sb.AppendLine("- Generate plausible content even for sections not explicitly mentioned in the story.");
        sb.AppendLine();
        sb.AppendLine("=== STORY ===");
        sb.AppendLine(story.Trim());
        sb.AppendLine();
        sb.AppendLine("=== REQUIRED JSON SCHEMA ===");
        sb.AppendLine("""
{
  "Apps": {
    "Messages": { "Conversations": [ { "Contact": "", "Avatar": "👤", "LastMessage": "", "Time": "", "Messages": [ { "Sender": "", "Content": "", "Timestamp": "", "IsOutgoing": false } ] } ] },
    "Photos": { "Photos": [ { "Url": "", "Caption": "" } ] },
    "Email": { "Inbox": [ { "From": "", "To": "", "Subject": "", "Body": "", "Preview": "", "Time": "" } ], "Sent": [], "Drafts": [] },
    "Notes": { "Notes": [ { "Title": "", "Content": "", "Time": "" } ] },
    "Files": { "Items": [ { "Name": "", "Type": "Document", "Description": "" } ] },
    "Phone": { "Calls": [ { "Contact": "", "Time": "", "Duration": "", "IsIncoming": false, "Answered": false } ] }
  }
}
""");
        return sb.ToString();
    }

    /// <summary>
    /// If fallback deserialization was used and devices/Apps are missing or empty, re-read from raw JSON and add all devices with their apps.
    /// </summary>
    private static void RepairDeviceAppsFromRawJson(GeneratedGameData result, string rawJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(rawJson);
            var root = doc.RootElement;
            if (!TryGetProperty(root, "Devices", out var devicesEl) || devicesEl.ValueKind != JsonValueKind.Array)
                return;
            var count = devicesEl.GetArrayLength();
            for (var i = 0; i < count; i++)
            {
                var devEl = devicesEl[i];
                GeneratedDevice device;
                if (i < result.Devices.Count)
                {
                    device = result.Devices[i];
                    if (device.Apps == null)
                        device.Apps = new GeneratedDeviceApps();
                }
                else
                {
                    device = new GeneratedDevice
                    {
                        DeviceType = GetString(devEl, "DeviceType") ?? "iPhone",
                        OwnerName = GetString(devEl, "OwnerName") ?? "",
                        Apps = ParseDeviceApps(devEl)
                    };
                    result.Devices.Add(device);
                    continue;
                }
                if (!TryGetProperty(devEl, "Apps", out var appsEl))
                    continue;
                if (TryGetProperty(appsEl, "Messages", out var messagesEl) && TryGetProperty(messagesEl, "Conversations", out var convEl) && convEl.ValueKind == JsonValueKind.Array && (device.Apps.Messages?.Conversations?.Count ?? 0) == 0)
                {
                    device.Apps.Messages ??= new GeneratedMessageApp();
                    try
                    {
                        var list = JsonSerializer.Deserialize<List<GeneratedConversation>>(convEl.GetRawText(), JsonOptions);
                        if (list != null && list.Count > 0)
                            device.Apps.Messages.Conversations = list;
                    }
                    catch { }
                }
                if (TryGetProperty(appsEl, "Photos", out var photosEl) && TryGetProperty(photosEl, "Photos", out var photosArr) && photosArr.ValueKind == JsonValueKind.Array && (device.Apps.Photos?.Photos?.Count ?? 0) == 0)
                {
                    device.Apps.Photos ??= new GeneratedPhotosApp();
                    try
                    {
                        var list = JsonSerializer.Deserialize<List<GeneratedPhoto>>(photosArr.GetRawText(), JsonOptions);
                        if (list != null && list.Count > 0)
                            device.Apps.Photos.Photos = list;
                    }
                    catch { }
                }
                if (TryGetProperty(appsEl, "Email", out var emailEl) && TryGetProperty(emailEl, "Emails", out var emailsArr) && emailsArr.ValueKind == JsonValueKind.Array && (device.Apps.Email?.Emails?.Count ?? 0) == 0)
                {
                    device.Apps.Email ??= new GeneratedEmailApp();
                    try
                    {
                        var list = JsonSerializer.Deserialize<List<GeneratedEmail>>(emailsArr.GetRawText(), JsonOptions);
                        if (list != null && list.Count > 0)
                            device.Apps.Email.Emails = list;
                    }
                    catch { }
                }
                if (TryGetProperty(appsEl, "Notes", out var notesEl) && TryGetProperty(notesEl, "Notes", out var notesArr) && notesArr.ValueKind == JsonValueKind.Array && (device.Apps.Notes?.Notes?.Count ?? 0) == 0)
                {
                    device.Apps.Notes ??= new GeneratedNotesApp();
                    try
                    {
                        var list = JsonSerializer.Deserialize<List<GeneratedNote>>(notesArr.GetRawText(), JsonOptions);
                        if (list != null && list.Count > 0)
                            device.Apps.Notes.Notes = list;
                    }
                    catch { }
                }
                if (TryGetProperty(appsEl, "Files", out var filesEl) && TryGetProperty(filesEl, "Items", out var itemsArr) && itemsArr.ValueKind == JsonValueKind.Array && (device.Apps.Files?.Items?.Count ?? 0) == 0)
                {
                    device.Apps.Files ??= new GeneratedFilesApp();
                    try
                    {
                        var list = JsonSerializer.Deserialize<List<GeneratedFileItem>>(itemsArr.GetRawText(), JsonOptions);
                        if (list != null && list.Count > 0)
                            device.Apps.Files.Items = list;
                    }
                    catch { }
                }
            }
        }
        catch
        {
            // best-effort repair
        }
    }

    private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
    {
        if (element.TryGetProperty(name, out value))
            return true;
        foreach (var p in element.EnumerateObject())
        {
            if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = p.Value;
                return true;
            }
        }
        value = default;
        return false;
    }

    private static bool TryGetAnyProperty(JsonElement element, out JsonElement value, params string[] names)
    {
        foreach (var name in names)
        {
            if (TryGetProperty(element, name, out value))
                return true;
        }
        value = default;
        return false;
    }

    private static string ExtractJsonFromResponse(string text)
    {
        text = text.Trim();
        var match = Regex.Match(text, @"\{[\s\S]*\}", RegexOptions.Singleline);
        if (match.Success)
            return match.Value;
        if (text.StartsWith("```"))
        {
            var end = text.IndexOf("```", 3, StringComparison.Ordinal);
            if (end > 0)
                text = text[3..end].Trim();
            if (text.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                text = text[4..].Trim();
        }
        return text;
    }

    private static GeneratedGameData GetMockGeneratedData(string story, bool quotaExceeded = false)
    {
        return new GeneratedGameData
        {
            Title = quotaExceeded ? "Joc șablon (limita AI atinsă)" : "Joc generat din poveste",
            Description = quotaExceeded ? "Limita AI a fost atinsă. Editează jocul manual sau reîncearcă mai târziu." : "Generat automat. Completează și publică.",
            Story = story,
            Solution = "Completează soluția în editor.",
            Characters = new List<GeneratedCharacter>
            {
                new() { Name = "Personaj 1", Role = "Suspect", Description = "Descriere", Motive = "?", Alibi = "?" },
                new() { Name = "Personaj 2", Role = "Victimă", Description = "Descriere", Motive = "-", Alibi = "-" }
            },
            Devices = new List<GeneratedDevice>
            {
                new()
                {
                    DeviceType = "iPhone",
                    OwnerName = "Personaj 1",
                    Apps = new GeneratedDeviceApps
                    {
                        Messages = new GeneratedMessageApp
                        {
                            Conversations = new List<GeneratedConversation>
                            {
                                new()
                                {
                                    Contact = "Contact",
                                    LastMessage = "Mesaj important...",
                                    Time = "Ieri",
                                    Messages = new List<GeneratedMessage>
                                    {
                                        new() { Sender = "Contact", Content = "Adaugă indicii aici.", Timestamp = "10:00", IsOutgoing = false }
                                    }
                                }
                            }
                        },
                        Email = new GeneratedEmailApp { Emails = new List<GeneratedEmail>() },
                        Notes = new GeneratedNotesApp { Notes = new List<GeneratedNote>() },
                        Photos = new GeneratedPhotosApp { Photos = new List<GeneratedPhoto>() }
                    }
                }
            }
        };
    }
}
