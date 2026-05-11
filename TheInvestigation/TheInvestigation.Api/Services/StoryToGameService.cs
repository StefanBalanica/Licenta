using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using TheInvestigation.Api.DTOs;

namespace TheInvestigation.Api.Services;

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

        var storyDeviceBlocks = SplitIntoDeviceBlocks(story);
        var deviceTasks = result.Devices.Select(async (device, deviceIndex) =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var scopedStory = SelectDeviceScopedStory(story, storyDeviceBlocks, device, deviceIndex);
                var devicePrompt = BuildSingleDevicePrompt(scopedStory, device.DeviceType, device.OwnerName);
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
        if (TryGetAnyProperty(appsEl, out var messagesEl, "Messages", "Message", "Chats", "Chat", "Texts", "TextMessages", "Mesaje", "Conversations", "Conversații", "Conversatii"))
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
        if (TryGetAnyProperty(appsEl, out var photosEl, "Photos", "Gallery", "Images", "Poze", "Fotografii"))
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
        if (TryGetAnyProperty(appsEl, out var emailEl, "Email", "Emails", "Mail", "Mails", "Emailuri", "Email-uri"))
        {
            var emailApp = new GeneratedEmailApp();
            // Support both flat array and structured {Inbox, Sent, Drafts} formats
            if (emailEl.ValueKind == JsonValueKind.Array)
            {
                try { emailApp.Emails = JsonSerializer.Deserialize<List<GeneratedEmail>>(emailEl.GetRawText(), JsonOptions) ?? new(); } catch { }
            }
            else
            {
                if (TryGetAnyProperty(emailEl, out var inboxEl, "Inbox", "Received", "Incoming", "Primite") && inboxEl.ValueKind == JsonValueKind.Array)
                    try { emailApp.Inbox = JsonSerializer.Deserialize<List<GeneratedEmail>>(inboxEl.GetRawText(), JsonOptions) ?? new(); } catch { }
                if (TryGetAnyProperty(emailEl, out var sentEl, "Sent", "Outgoing", "Trimise") && sentEl.ValueKind == JsonValueKind.Array)
                    try { emailApp.Sent = JsonSerializer.Deserialize<List<GeneratedEmail>>(sentEl.GetRawText(), JsonOptions) ?? new(); } catch { }
                if (TryGetAnyProperty(emailEl, out var draftsEl, "Drafts", "Draft", "Ciorne") && draftsEl.ValueKind == JsonValueKind.Array)
                    try { emailApp.Drafts = JsonSerializer.Deserialize<List<GeneratedEmail>>(draftsEl.GetRawText(), JsonOptions) ?? new(); } catch { }
                if (TryGetAnyProperty(emailEl, out var emailsArr, "Emails", "Items", "Messages", "Emailuri", "Email-uri") && emailsArr.ValueKind == JsonValueKind.Array)
                    try { emailApp.Emails = JsonSerializer.Deserialize<List<GeneratedEmail>>(emailsArr.GetRawText(), JsonOptions) ?? new(); } catch { }
            }
            apps.Email = emailApp;
        }
        else
            apps.Email = new GeneratedEmailApp();

        // ── Notes ────────────────────────────────────────────────────────────────
        if (TryGetAnyProperty(appsEl, out var notesEl, "Notes", "Note", "Memos", "Notite", "Notițe"))
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
        if (TryGetAnyProperty(appsEl, out var filesEl, "Files", "Documents", "Docs", "Fisiere", "Fișiere"))
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
        if (TryGetAnyProperty(appsEl, out var phoneEl, "Phone", "Calls", "CallLog", "CallHistory", "Apeluri", "Telefon"))
        {
            try
            {
                List<GeneratedCall>? calls = null;
                if (phoneEl.ValueKind == JsonValueKind.Array)
                {
                    calls = JsonSerializer.Deserialize<List<GeneratedCall>>(phoneEl.GetRawText(), JsonOptions);
                }
                else if (TryGetAnyProperty(phoneEl, out var callsEl, "Calls", "Items", "History", "Apeluri") && callsEl.ValueKind == JsonValueKind.Array)
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
        // Retry on rate-limit (TPM) to smooth out bursts.
        // Default: max 4 attempts with small backoff; respects "Please try again in Xs" when present.
        var maxAttempts = Math.Clamp(_configuration.GetValue<int?>("GroqSettings:MaxRetryAttempts") ?? 4, 1, 8);
        var baseDelayMs = Math.Clamp(_configuration.GetValue<int?>("GroqSettings:RetryBaseDelayMs") ?? 700, 200, 5000);

        // Keep max_tokens conservative to avoid TPM spikes.
        var maxTokens = Math.Clamp(_configuration.GetValue<int?>("GroqSettings:MaxTokens") ?? 2600, 800, 5000);

        var model = _configuration["GroqSettings:Model"] ?? DefaultGroqModel;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var apiKey = GetNextApiKey();
            // First try JSON mode; if Groq returns "failed_generation", fallback to non-JSON-mode and extract JSON ourselves.
            var useJsonMode = true;
            for (var modeTry = 0; modeTry < 2; modeTry++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
                request.Headers.Add("Authorization", "Bearer " + apiKey);

                object body = useJsonMode
                    ? new
                    {
                        model,
                        messages = new[] { new { role = "user", content = prompt } },
                        temperature = 0.35,
                        max_tokens = maxTokens,
                        response_format = new { type = "json_object" }
                    }
                    : new
                    {
                        model,
                        messages = new[] { new { role = "user", content = prompt + "\n\nCRITICAL: Output ONLY raw JSON. Do not use markdown fences." } },
                        temperature = 0.2,
                        max_tokens = Math.Min(maxTokens, 2200)
                    };

                request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

                HttpResponseMessage response;
                string responseJson;
                try
                {
                    response = await _httpClient.SendAsync(request, ct);
                    responseJson = await response.Content.ReadAsStringAsync(ct);
                }
                catch (Exception ex) when (attempt < maxAttempts)
                {
                    _logger.LogWarning(ex, "Groq call failed (attempt {Attempt}/{Max}). Retrying...", attempt, maxAttempts);
                    await Task.Delay(baseDelayMs * attempt, ct);
                    goto NextAttempt;
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errMsg = GetErrorMessage(responseJson, (int)response.StatusCode, response.ReasonPhrase ?? "");

                    // Groq JSON mode sometimes fails with failed_generation. Fallback once without json mode.
                    if (useJsonMode && (errMsg.Contains("failed_generation", StringComparison.OrdinalIgnoreCase) ||
                                        errMsg.Contains("Failed to generate JSON", StringComparison.OrdinalIgnoreCase)))
                    {
                        _logger.LogWarning("Groq JSON-mode failed_generation. Falling back to non-JSON mode. Msg: {Msg}", errMsg);
                        useJsonMode = false;
                        continue; // retry same attempt with non-json mode
                    }

                    // Handle TPM / rate-limit: wait and retry.
                    if ((int)response.StatusCode == 429 || errMsg.Contains("Rate limit", StringComparison.OrdinalIgnoreCase) || errMsg.Contains("TPM", StringComparison.OrdinalIgnoreCase))
                    {
                        var waitMs = TryParseRetryAfterMs(errMsg) ?? (baseDelayMs * attempt);
                        if (attempt < maxAttempts)
                        {
                            _logger.LogWarning("Groq rate-limited (attempt {Attempt}/{Max}). Waiting {WaitMs}ms. Msg: {Msg}",
                                attempt, maxAttempts, waitMs, errMsg);
                            await Task.Delay(waitMs, ct);
                            goto NextAttempt;
                        }
                    }

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

        NextAttempt:
            ;
        }

        // Should never reach here due to throw/return; keep compiler happy.
        return (null, true);
    }

    private static string GetErrorMessage(string responseJson, int statusCode, string reasonPhrase)
    {
        try
        {
            var doc = JsonDocument.Parse(responseJson);
            if (doc.RootElement.TryGetProperty("error", out var err))
            {
                if (err.TryGetProperty("message", out var msg))
                {
                    var baseMsg = msg.GetString() ?? $"{statusCode} {reasonPhrase}";
                    // Include failed_generation details if present (Groq JSON mode)
                    if (err.TryGetProperty("failed_generation", out var fg) && fg.ValueKind == JsonValueKind.String)
                        return $"{baseMsg} | failed_generation: {fg.GetString()}";
                    return baseMsg;
                }
                if (err.TryGetProperty("error", out var nested))
                    return nested.GetProperty("message").GetString() ?? $"{statusCode} {reasonPhrase}";
            }
        }
        catch { }
        return $"{statusCode} {reasonPhrase}";
    }

    /// <summary>
    /// Extract retry delay from Groq error messages like:
    /// "Please try again in 1.615s."
    /// Returns milliseconds (with a small safety buffer) or null if not found.
    /// </summary>
    private static int? TryParseRetryAfterMs(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return null;
        var m = Regex.Match(message, @"try again in\s+(?<sec>\d+(?:\.\d+)?)s", RegexOptions.IgnoreCase);
        if (!m.Success) return null;
        if (!double.TryParse(m.Groups["sec"].Value, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var sec))
            return null;
        // +250ms buffer to avoid immediate re-limit
        var ms = (int)Math.Ceiling(sec * 1000.0) + 250;
        return Math.Clamp(ms, 200, 30_000);
    }

    private static string BuildMetadataPrompt(string story)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a forensic data extraction engine for a murder mystery game backend.");
        sb.AppendLine("TASK: Extract metadata, characters, and the complete physical device inventory from the report.");
        sb.AppendLine("CRITICAL: Output ONLY raw JSON. No markdown. No explanations.");
        sb.AppendLine();
        sb.AppendLine("=== EXTRACTION RULES ===");
        sb.AppendLine("[CHARACTERS]");
        sb.AppendLine("- Extract every distinct named character mentioned in the report.");
        sb.AppendLine("- Fill Role, Description, Backstory, Motive, and Alibi only from the text. If absent, use empty string.");
        sb.AppendLine("- Preserve the ORIGINAL LANGUAGE from the report. If the brief is in Romanian, output Romanian. NEVER translate to English.");
        sb.AppendLine("- Preserve wording as closely as possible to the source text. Prefer exact phrases or minimally shortened fragments from the brief.");
        sb.AppendLine("- Do NOT normalize names, roles, motives, alibis, or descriptions into generic English labels.");
        sb.AppendLine("- If the report explicitly states relationship, occupation, motive, alibi, or notes, keep that meaning in the same language and same style.");
        sb.AppendLine("- Description should be factual, based on the brief, not invented characterization.");
        sb.AppendLine("- Backstory should contain known facts from the brief, not a rewritten narrative.");
        sb.AppendLine("- Motive and Alibi must be copied from the report if present; do not invent probable ones.");
        sb.AppendLine("[DEVICES]");
        sb.AppendLine("- Process ALL device sections in the report, not just the first one.");
        sb.AppendLine("- A device section starts with a header like: DISPOZITIV X — [Tip] (al lui/al [Nume]).");
        sb.AppendLine("- Identify ALL devices. Set DeviceType (iPhone/Android/Laptop), OwnerName, and Passcode.");
        sb.AppendLine("- Preserve one output device for each real device section found in the report.");
        sb.AppendLine("- DO NOT extract Apps or contents here. Just identify the physical devices.");
        sb.AppendLine("- Do not invent devices, owners, or passcodes.");
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
        sb.AppendLine($"TASK: Extract ALL raw digital evidence from the {deviceType} owned by {ownerName}.");
        sb.AppendLine("CRITICAL: Output ONLY valid JSON. Follow the SCHEMA exactly. Do NOT omit any field. Return empty arrays where no data exists.");
        sb.AppendLine($"FOCUS: Extract only data that belongs to {ownerName}'s {deviceType} section. Ignore all other devices.");
        sb.AppendLine();
        sb.AppendLine("=== RULES ===");
        sb.AppendLine("- Do NOT summarize the story.");
        sb.AppendLine("- Do NOT invent or generate plausible content.");
        sb.AppendLine("- Extract raw evidence only from the report text for this device.");
        sb.AppendLine("- Process the entire device section until the next device header or end of report.");
        sb.AppendLine("- Treat inconsistent formatting as structured evidence, not prose.");
        sb.AppendLine("- Messages.Conversations: include every conversation found on this device. Group by contact.");
        sb.AppendLine($"- For outgoing messages use Sender={ownerName}. For incoming messages use Sender=contact name.");
        sb.AppendLine("- Email.Inbox: emails received. Email.Sent: emails sent. Email.Drafts: unsent drafts.");
        sb.AppendLine("- Notes.Notes: all notes or memos found on the device.");
        sb.AppendLine("- Files.Items: all files/documents found on the device.");
        sb.AppendLine("- Photos.Photos: all image placeholders/evidence files found on the device.");
        sb.AppendLine("- Phone.Calls: extract EVERY call row or list item.");
        sb.AppendLine("- For each call, always fill these fields separately: Contact, Date, Time, Duration, IsIncoming, Answered, Type, AudioFileName, AudioUrl.");
        sb.AppendLine("- Call mapping rule for audio: if a call row contains `fisier : name.mp3` or any explicit audio filename, set AudioFileName to that filename exactly; otherwise use empty string.");
        sb.AppendLine("- If AudioFileName is present but there is no real uploaded file, set AudioUrl to `upload-required://<filename>?types=mp3`.");
        sb.AppendLine("- If no audio file is specified, set AudioFileName and AudioUrl to empty string.");
        sb.AppendLine("- Keep Date and Time as separate fields. Never merge them.");
        sb.AppendLine("- Preserve exact names, subjects, file names, dates, times, and durations from the report.");
        sb.AppendLine("- If a section has NO data, return an empty array [] for it. NEVER omit a key.");
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
    "Phone": { "Calls": [ { "Contact": "", "Date": "", "Time": "", "Duration": "", "IsIncoming": false, "Answered": false, "Type": "", "AudioUrl": "", "AudioFileName": "" } ] }
  }
}
""");
        return sb.ToString();
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

    private static List<(string Header, string Block)> SplitIntoDeviceBlocks(string story)
    {
        var blocks = new List<(string Header, string Block)>();
        if (string.IsNullOrWhiteSpace(story))
            return blocks;

        var lines = story.Split(new[] { '\r', '\n' }, StringSplitOptions.None);
        var headerRegex = new Regex(
            @"^(?:[\p{So}\p{Sk}\p{P}\s]*)?(?:DISPOZITIV(?:UL)?|DEVICE)\s*\d+\b.*$",
            RegexOptions.IgnoreCase);

        int start = -1;
        string header = string.Empty;

        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (line.Length > 3 && headerRegex.IsMatch(line))
            {
                if (start >= 0)
                    blocks.Add((header, string.Join("\n", lines[start..i])));
                start = i;
                header = line;
            }
        }

        if (start >= 0)
            blocks.Add((header, string.Join("\n", lines[start..])));

        return blocks;
    }

    private static string SelectDeviceScopedStory(
        string fullStory,
        List<(string Header, string Block)> blocks,
        GeneratedDevice device,
        int deviceIndex)
    {
        if (blocks.Count == 0)
            return fullStory;

        foreach (var (header, block) in blocks)
        {
            if (header.Contains(device.OwnerName ?? string.Empty, StringComparison.OrdinalIgnoreCase)
                && header.Contains(device.DeviceType ?? string.Empty, StringComparison.OrdinalIgnoreCase))
            {
                return block;
            }
        }

        if (deviceIndex >= 0 && deviceIndex < blocks.Count)
            return blocks[deviceIndex].Block;

        return fullStory;
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

}
