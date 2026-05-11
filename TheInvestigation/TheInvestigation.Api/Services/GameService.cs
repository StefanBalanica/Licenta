using System.Text.Json;
using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Models;
using TheInvestigation.Api.Repositories;

namespace TheInvestigation.Api.Services;

/// <summary>
/// Service implementation for game management operations
/// </summary>
public class GameService : IGameService
{
    private readonly IGameRepository _gameRepository;
    private readonly IRepository<Character> _characterRepository;
    private readonly IRepository<DigitalDevice> _deviceRepository;
    private readonly IRepository<DeviceApp> _appRepository;
    private readonly IStoryToGameService _storyToGameService;

    public GameService(
        IGameRepository gameRepository,
        IRepository<Character> characterRepository,
        IRepository<DigitalDevice> deviceRepository,
        IRepository<DeviceApp> appRepository,
        IStoryToGameService storyToGameService)
    {
        _gameRepository = gameRepository;
        _characterRepository = characterRepository;
        _deviceRepository = deviceRepository;
        _appRepository = appRepository;
        _storyToGameService = storyToGameService;
    }

    public async Task<GameDto> CreateGameAsync(int userId, CreateGameDto createGameDto)
    {
        var game = new Game
        {
            UserId = userId,
            Title = createGameDto.Title,
            Description = createGameDto.Description,
            Story = createGameDto.Story,
            Solution = createGameDto.Solution
        };

        await _gameRepository.AddAsync(game);

        // Create investigator's special devices (Laptop + iPhone) automatically
        await CreateInvestigatorDevicesAsync(game.GameId, game.Title, new List<string>());

        return MapToDto(game);
    }

    public async Task<GameDto> GetGameAsync(int gameId, int userId)
    {
        var game = await _gameRepository.GetGameWithDetailsAsync(gameId);
        
        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        if (game.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this game");
        }

        return MapToDto(game);
    }

    public async Task<IEnumerable<GameSummaryDto>> GetUserGamesAsync(int userId)
    {
        var games = await _gameRepository.GetUserGamesAsync(userId);
        return games.Select(MapToSummaryDto);
    }

    public async Task<GameDto> UpdateGameAsync(int gameId, int userId, UpdateGameDto updateGameDto)
    {
        var game = await _gameRepository.GetGameWithDetailsAsync(gameId);
        
        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        if (game.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this game");
        }

        // Update fields if provided
        if (updateGameDto.Title != null)
            game.Title = updateGameDto.Title;
        
        if (updateGameDto.Description != null)
            game.Description = updateGameDto.Description;
        
        if (updateGameDto.Story != null)
            game.Story = updateGameDto.Story;
        
        if (updateGameDto.Solution != null)
            game.Solution = updateGameDto.Solution;

        game.UpdatedAt = DateTime.UtcNow;

        await _gameRepository.UpdateAsync(game);

        return MapToDto(game);
    }

    public async Task DeleteGameAsync(int gameId, int userId)
    {
        var game = await _gameRepository.GetGameWithDetailsAsync(gameId);
        
        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        if (game.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this game");
        }

        await _gameRepository.DeleteAsync(game);
    }

    public async Task<GameDto> PublishGameAsync(int gameId, int userId, PublishGameDto dto)
    {
        var game = await _gameRepository.GetGameWithDetailsAsync(gameId);
        
        if (game == null)
        {
            throw new KeyNotFoundException($"Game with ID {gameId} not found");
        }

        if (game.UserId != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this game");
        }

        var title = dto.Title?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ArgumentException("Title is required to publish.");
        }

        if (title.Length > 200)
        {
            throw new ArgumentException("Title must be at most 200 characters.");
        }

        if (dto.PriceRon < 0)
        {
            throw new ArgumentException("Price cannot be negative.");
        }

        game.Title = title;
        game.PriceRon = dto.PriceRon;
        game.IsPublished = true;
        game.UpdatedAt = DateTime.UtcNow;

        await _gameRepository.UpdateAsync(game);

        return MapToDto(game);
    }

    public async Task<GameDto> CreateGameFromStoryAsync(int userId, string story, CancellationToken cancellationToken = default)
    {
        var generated = await _storyToGameService.GenerateFromStoryAsync(story, cancellationToken);
        EnrichGeneratedCharactersFromStory(generated, story);

        // Enrich generated devices with Phone calls and structured Email folders
        // Use the ORIGINAL story text (not the AI-summarised one) so emoji markers are preserved
        EnrichGeneratedDevicesFromStory(generated, story);

        var game = new Game
        {
            UserId = userId,
            Title = generated.Title,
            Description = generated.Description ?? "",
            Story = generated.Story,
            Solution = generated.Solution
        };
        await _gameRepository.AddAsync(game);

        foreach (var c in generated.Characters)
        {
            var character = new Character
            {
                GameId = game.GameId,
                Name = c.Name,
                Role = c.Role,
                Description = c.Description,
                Backstory = c.Backstory,
                Motive = c.Motive,
                Alibi = c.Alibi
            };
            await _characterRepository.AddAsync(character);
        }

        foreach (var d in generated.Devices)
        {
            var device = new DigitalDevice
            {
                GameId = game.GameId,
                DeviceType = string.IsNullOrWhiteSpace(d.DeviceType) ? "iPhone" : d.DeviceType,
                OwnerName = d.OwnerName,
                Passcode = string.IsNullOrWhiteSpace(d.Passcode) ? null : d.Passcode,
                UniqueUrl = Guid.NewGuid().ToString()
            };
            await _deviceRepository.AddAsync(device);

            var apps = d.Apps;
            if (apps?.Messages?.Conversations != null && apps.Messages.Conversations.Count > 0)
            {
                var messageAppData = new MessageAppData
                {
                    Conversations = apps.Messages.Conversations.Select(c =>
                    {
                        var msgList = (c.Messages ?? new List<GeneratedMessage>())
                            .Where(m => !string.IsNullOrWhiteSpace(m.Content))
                            .Select(m => new Message
                            {
                                Sender = m.Sender,
                                Content = m.Content,
                                Timestamp = m.Timestamp,
                                IsOutgoing = m.IsOutgoing
                            }).ToList();
                        if (msgList.Count == 0 && !string.IsNullOrWhiteSpace(c.LastMessage))
                            msgList.Add(new Message { Sender = c.Contact, Content = c.LastMessage, Timestamp = c.Time ?? "", IsOutgoing = false });
                        if (msgList.Count == 0)
                            msgList.Add(new Message { Sender = c.Contact, Content = "(fără conținut)", Timestamp = c.Time ?? "", IsOutgoing = false });
                        return new Conversation
                        {
                            Contact = c.Contact,
                            Avatar = c.Avatar ?? "👤",
                            LastMessage = c.LastMessage,
                            Time = c.Time,
                            Messages = msgList
                        };
                    }).ToList()
                };
                await AddDeviceAppAsync(device.DeviceId, "Messages", messageAppData);
            }
            if (apps?.Photos?.Photos != null && apps.Photos.Photos.Count > 0)
            {
                var photosAppData = new PhotosAppData
                {
                    Photos = apps.Photos.Photos.Select(p => new Photo { Url = p.Url, Caption = p.Caption }).ToList()
                };
                await AddDeviceAppAsync(device.DeviceId, "Photos", photosAppData);
            }
            // Email: always save if we have any email data (from AI or parsed)
            if (apps?.Email != null)
            {
                var emailAppData = new EmailAppData
                {
                    Emails = (apps.Email.Emails ?? new List<GeneratedEmail>()).Select(e => new Email
                    {
                        From = e.From ?? "",
                        To = e.To ?? "",
                        Subject = e.Subject ?? "",
                        Body = e.Body ?? "",
                        Preview = !string.IsNullOrWhiteSpace(e.Preview)
                            ? e.Preview
                            : (string.IsNullOrWhiteSpace(e.Body) ? "" : (e.Body.Length > 100 ? e.Body[..100] : e.Body)),
                        Time = e.Time ?? ""
                    }).ToList(),
                    Inbox = (apps.Email.Inbox ?? new List<GeneratedEmail>()).Select(e => new Email
                    {
                        From = e.From ?? "",
                        To = e.To ?? "",
                        Subject = e.Subject ?? "",
                        Body = e.Body ?? "",
                        Preview = !string.IsNullOrWhiteSpace(e.Preview)
                            ? e.Preview
                            : (string.IsNullOrWhiteSpace(e.Body) ? "" : (e.Body.Length > 100 ? e.Body[..100] : e.Body)),
                        Time = e.Time ?? ""
                    }).ToList(),
                    Sent = (apps.Email.Sent ?? new List<GeneratedEmail>()).Select(e => new Email
                    {
                        From = e.From ?? "",
                        To = e.To ?? "",
                        Subject = e.Subject ?? "",
                        Body = e.Body ?? "",
                        Preview = !string.IsNullOrWhiteSpace(e.Preview)
                            ? e.Preview
                            : (string.IsNullOrWhiteSpace(e.Body) ? "" : (e.Body.Length > 100 ? e.Body[..100] : e.Body)),
                        Time = e.Time ?? ""
                    }).ToList(),
                    Drafts = (apps.Email.Drafts ?? new List<GeneratedEmail>()).Select(e => new Email
                    {
                        From = e.From ?? "",
                        To = e.To ?? "",
                        Subject = e.Subject ?? "",
                        Body = e.Body ?? "",
                        Preview = !string.IsNullOrWhiteSpace(e.Preview)
                            ? e.Preview
                            : (string.IsNullOrWhiteSpace(e.Body) ? "" : (e.Body.Length > 100 ? e.Body[..100] : e.Body)),
                        Time = e.Time ?? ""
                    }).ToList()
                };
                // Save Email app if we have ANY email data (from any source)
                if (emailAppData.Emails.Count > 0 || emailAppData.Inbox.Count > 0 || emailAppData.Sent.Count > 0 || emailAppData.Drafts.Count > 0)
                {
                    await AddDeviceAppAsync(device.DeviceId, "Email", emailAppData);
                }
            }
            if (apps?.Notes?.Notes != null && apps.Notes.Notes.Count > 0)
            {
                var notesAppData = new NotesAppData
                {
                    Notes = apps.Notes.Notes.Select(n => new Note
                    {
                        Title = n.Title,
                        Content = n.Content,
                        Time = n.Time
                    }).ToList()
                };
                await AddDeviceAppAsync(device.DeviceId, "Notes", notesAppData);
            }
            if (apps?.Files?.Items != null && apps.Files.Items.Count > 0)
            {
                var filesAppData = new FilesAppData
                {
                    Items = apps.Files.Items.Select(f => new FileItem
                    {
                        Name = f.Name,
                        Type = string.IsNullOrWhiteSpace(f.Type) ? "Document" : f.Type,
                        Description = f.Description
                    }).ToList()
                };
                await AddDeviceAppAsync(device.DeviceId, "Files", filesAppData);
            }

            // Phone: always save if we have any calls (from AI or parsed)
            if (apps?.Phone?.Calls != null && apps.Phone.Calls.Count > 0)
            {
                var phoneAppData = new PhoneAppData
                {
                    Calls = apps.Phone.Calls.Select(c => new CallLogItem
                    {
                        Contact = c.Contact,
                        Date = c.Date,
                        Time = c.Time,
                        Duration = c.Duration,
                        IsIncoming = c.IsIncoming,
                        Answered = c.Answered,
                        Type = c.Type,
                        AudioUrl = c.AudioUrl,
                        AudioFileName = c.AudioFileName
                    }).ToList()
                };
                await AddDeviceAppAsync(device.DeviceId, "Phone", phoneAppData);
            }
        }

        // Create investigator's special devices (Laptop + iPhone) with characters from story
        var characterNames = generated.Characters.Select(c => c.Name).ToList();
        await CreateInvestigatorDevicesAsync(game.GameId, game.Title, characterNames);

        var created = await _gameRepository.GetGameWithDetailsAsync(game.GameId);
        return MapToDto(created!);
    }

    private static readonly JsonSerializerOptions AppDataJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private static void EnrichGeneratedCharactersFromStory(GeneratedGameData generated, string originalStory)
    {
        var parsedCharacters = ParseCharactersFromStory(originalStory);
        if (parsedCharacters.Count == 0)
            return;

        generated.Characters = parsedCharacters;
    }

    private static List<GeneratedCharacter> ParseCharactersFromStory(string story)
    {
        var result = new List<GeneratedCharacter>();
        if (string.IsNullOrWhiteSpace(story))
            return result;

        var lines = story.Split(new[] { '\r', '\n' }, StringSplitOptions.None);
        var headerRegex = new System.Text.RegularExpressions.Regex(
            @"^\s*([A-ZĂÂÎȘŞȚŢ][A-ZĂÂÎȘŞȚŢa-zăâîșşțţ'’\-\s]+?)\s*\(([^)]+)\)\s*$",
            System.Text.RegularExpressions.RegexOptions.CultureInvariant);

        int i = 0;
        while (i < lines.Length)
        {
            var line = (lines[i] ?? string.Empty).Trim();
            var match = headerRegex.Match(line);
            if (!match.Success || line.StartsWith("DISPOZITIV", StringComparison.OrdinalIgnoreCase))
            {
                i++;
                continue;
            }

            var name = match.Groups[1].Value.Trim();
            var role = match.Groups[2].Value.Trim();
            i++;

            string relation = string.Empty;
            string occupation = string.Empty;
            string phone = string.Empty;
            string notes = string.Empty;
            string victimStory = string.Empty;
            string alibiStory = string.Empty;

            while (i < lines.Length)
            {
                var current = (lines[i] ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(current))
                {
                    i++;
                    continue;
                }

                if (headerRegex.IsMatch(current) || current.StartsWith("DISPOZITIVE", StringComparison.OrdinalIgnoreCase) || current.StartsWith("DISPOZITIV", StringComparison.OrdinalIgnoreCase))
                    break;

                relation = TryReadPrefixedValue(lines, ref i, "Relație:", relation);
                if (!string.IsNullOrWhiteSpace(relation) && current.StartsWith("Relație:", StringComparison.OrdinalIgnoreCase))
                    continue;

                occupation = TryReadPrefixedValue(lines, ref i, "Ocupație:", occupation);
                if (!string.IsNullOrWhiteSpace(occupation) && current.StartsWith("Ocupație:", StringComparison.OrdinalIgnoreCase))
                    continue;

                phone = TryReadPrefixedValue(lines, ref i, "Număr telefon:", phone);
                if (!string.IsNullOrWhiteSpace(phone) && current.StartsWith("Număr telefon:", StringComparison.OrdinalIgnoreCase))
                    continue;

                notes = TryReadPrefixedValue(lines, ref i, "Notițe:", notes);
                if (!string.IsNullOrWhiteSpace(notes) && current.StartsWith("Notițe:", StringComparison.OrdinalIgnoreCase))
                    continue;

                victimStory = TryReadPrefixedValue(lines, ref i, "Povestea despre victimă:", victimStory);
                if (!string.IsNullOrWhiteSpace(victimStory) && current.StartsWith("Povestea despre victimă:", StringComparison.OrdinalIgnoreCase))
                    continue;

                alibiStory = TryReadPrefixedValue(lines, ref i, "Povestea alibiului:", alibiStory);
                if (!string.IsNullOrWhiteSpace(alibiStory) && current.StartsWith("Povestea alibiului:", StringComparison.OrdinalIgnoreCase))
                    continue;

                i++;
            }

            result.Add(new GeneratedCharacter
            {
                Name = name,
                Role = role,
                Description = BuildCharacterIdentityDetails(relation, occupation, phone),
                Backstory = notes,
                Motive = victimStory,
                Alibi = alibiStory
            });
        }

        return result;
    }

    private static string TryReadPrefixedValue(string[] lines, ref int index, string prefix, string existingValue)
    {
        var current = (lines[index] ?? string.Empty).Trim();
        if (!current.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return existingValue;

        var value = current[prefix.Length..].Trim();
        index++;
        while (index < lines.Length)
        {
            var next = (lines[index] ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(next))
            {
                index++;
                break;
            }

            if (next.Contains(':') && !next.StartsWith("-", StringComparison.Ordinal))
                break;

            value = string.IsNullOrWhiteSpace(value) ? next : $"{value} {next}";
            index++;
        }

        return value.Trim();
    }

    private static string BuildCharacterIdentityDetails(string relation, string occupation, string phone)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(relation))
            parts.Add($"Relație: {relation}");
        if (!string.IsNullOrWhiteSpace(occupation))
            parts.Add($"Ocupație: {occupation}");
        if (!string.IsNullOrWhiteSpace(phone))
            parts.Add($"Număr telefon: {phone}");
        return string.Join(" | ", parts);
    }

    private async Task AddDeviceAppAsync(int deviceId, string appType, object appData)
    {
        var jsonString = JsonSerializer.Serialize(appData, AppDataJsonOptions);
        var jsonDocument = JsonDocument.Parse(jsonString);
        var app = new DeviceApp
        {
            DeviceId = deviceId,
            AppType = appType,
            AppData = jsonDocument
        };
        await _appRepository.AddAsync(app);
    }

    /// <summary>
    /// Best-effort enrichment: parse the original story text to extract Phone calls, structured Email folders,
    /// and PIN passcodes for ALL devices. Uses the original user story text so emoji section markers are preserved.
    /// PIN extraction is done deterministically via regex so it works even if the AI missed it.
    /// </summary>
    private static void EnrichGeneratedDevicesFromStory(GeneratedGameData generated, string originalStory)
    {
        if (generated.Devices == null || generated.Devices.Count == 0)
            return;

        var storyText = originalStory ?? generated.Story ?? string.Empty;
        if (string.IsNullOrWhiteSpace(storyText))
            return;

        // Pre-split story into device blocks so we can scope PIN search per device
        var deviceBlocks = SplitIntoDeviceBlocks(storyText);

        for (int deviceIndex = 0; deviceIndex < generated.Devices.Count; deviceIndex++)
        {
            var device = generated.Devices[deviceIndex];
            device.Apps ??= new GeneratedDeviceApps();

            var ownerName = device.OwnerName ?? "Me";
            var characterSection = ExtractCharacterSection(storyText, ownerName);
            var deviceScopedText = ExtractDeviceBlockText(deviceBlocks, ownerName, device.DeviceType);

            // Fallback: when strict owner/type matching misses, use same-order device block.
            // This prevents completely empty devices for briefs where owner naming differs
            // between AI output and "DISPOZITIV X" headers.
            if (string.IsNullOrWhiteSpace(deviceScopedText) && deviceBlocks.Count > deviceIndex)
            {
                deviceScopedText = deviceBlocks[deviceIndex].Block;
            }
            var hasReliableDeviceBlock = !string.IsNullOrWhiteSpace(deviceScopedText);

            // ── PIN extraction — AI value has priority; regex only fills gaps ──────────
            // If the AI already extracted a valid numeric passcode, trust it (it read the
            // full per-device context). Only run regex when AI returned null/empty.
            var aiPasscode = device.Passcode;
            bool aiHasPin = !string.IsNullOrWhiteSpace(aiPasscode)
                            && System.Text.RegularExpressions.Regex.IsMatch(aiPasscode.Trim(), @"^\d{4,6}$");

            if (!aiHasPin)
            {
                // Level 1: structured device block (e.g. "DISPOZITIV 1 — iPhone al Mariei")
                var parsedPin = ExtractPinFromDeviceBlock(deviceBlocks, ownerName, device.DeviceType);

                // Level 2: character/owner section of the story
                if (string.IsNullOrWhiteSpace(parsedPin) && !string.IsNullOrWhiteSpace(characterSection))
                    parsedPin = ExtractPinFromText(characterSection);

                // Level 3: window of ±400 chars around first occurrence of owner name
                if (string.IsNullOrWhiteSpace(parsedPin))
                    parsedPin = ExtractPinNearOwner(storyText, ownerName);

                if (!string.IsNullOrWhiteSpace(parsedPin))
                    device.Passcode = parsedPin;
            }

            // Parse Messages from the strict device block.
            // If block parsing succeeds, it has priority over AI (prevents cross-device data leakage).
            var parsedConversations = hasReliableDeviceBlock
                ? ParseMessagesFromStory(deviceScopedText, ownerName)
                : new List<GeneratedConversation>();
            if (parsedConversations.Count > 0)
            {
                device.Apps.Messages ??= new GeneratedMessageApp();
                if (device.Apps.Messages.Conversations == null || device.Apps.Messages.Conversations.Count == 0)
                    device.Apps.Messages.Conversations = parsedConversations;
            }


            // Parse Phone calls (only for phones, not laptops)
            if (!string.Equals(device.DeviceType, "Laptop", StringComparison.OrdinalIgnoreCase))
            {
                // Strict block calls have priority over AI.
                var calls = hasReliableDeviceBlock
                    ? ParseCallsFromStory(deviceScopedText)
                    : new List<GeneratedCall>();
                if (calls.Count > 0)
                {
                    device.Apps.Phone ??= new GeneratedPhoneApp();
                    if (device.Apps.Phone.Calls == null || device.Apps.Phone.Calls.Count == 0)
                        device.Apps.Phone.Calls = calls;
                }
            }

            // Strict block emails have priority over AI.
            if (hasReliableDeviceBlock)
            {
                ParseEmailsFromStory(deviceScopedText, ownerName, out var inbox, out var sent, out var drafts);
                if (inbox.Count > 0 || sent.Count > 0 || drafts.Count > 0)
                {
                    device.Apps.Email ??= new GeneratedEmailApp();
                    if (device.Apps.Email.Inbox == null || device.Apps.Email.Inbox.Count == 0)
                        device.Apps.Email.Inbox = inbox;
                    if (device.Apps.Email.Sent == null || device.Apps.Email.Sent.Count == 0)
                        device.Apps.Email.Sent = sent;
                    if (device.Apps.Email.Drafts == null || device.Apps.Email.Drafts.Count == 0)
                        device.Apps.Email.Drafts = drafts;
                    device.Apps.Email.Emails ??= new List<GeneratedEmail>();
                }
            }
            // Notes are added only from explicit Notes section (not from forensic narrative labels).
            var aiHasNotes = device.Apps.Notes?.Notes != null && device.Apps.Notes.Notes.Count > 0;
            if (!aiHasNotes)
            {
                var parsedNotes = hasReliableDeviceBlock
                    ? ParseNotesFromStory(deviceScopedText)
                    : new List<GeneratedNote>();
                if (parsedNotes.Count > 0)
                {
                    device.Apps.Notes ??= new GeneratedNotesApp();
                    if (device.Apps.Notes.Notes == null || device.Apps.Notes.Notes.Count == 0)
                        device.Apps.Notes.Notes = parsedNotes;
                }
            }

            // Parse media upload requirements from strict device block (photos/audio/video filenames).
            var (requiredPhotos, requiredMediaFiles) = hasReliableDeviceBlock
                ? ParseMediaRequirementsFromStory(deviceScopedText)
                : (new List<GeneratedPhoto>(), new List<GeneratedFileItem>());
            if (requiredPhotos.Count > 0)
            {
                device.Apps.Photos ??= new GeneratedPhotosApp();
                if (device.Apps.Photos.Photos == null || device.Apps.Photos.Photos.Count == 0)
                    device.Apps.Photos.Photos = requiredPhotos;
            }
            if (requiredMediaFiles.Count > 0)
            {
                device.Apps.Files ??= new GeneratedFilesApp();
                var existing = device.Apps.Files.Items ?? new List<GeneratedFileItem>();
                // Keep existing non-required files and append required media entries.
                var filtered = existing
                    .Where(f => f.Description == null || !f.Description.Contains("upload-required://", StringComparison.OrdinalIgnoreCase))
                    .ToList();
                filtered.AddRange(requiredMediaFiles);
                device.Apps.Files.Items = filtered;
            }

            // Parse explicit file entries from "FISIERE/FIȘIERE" blocks (Fișier:, Ultima modificare:, etc).
            // This ensures we keep ALL documents listed in the brief, not only placeholders.
            if (hasReliableDeviceBlock)
            {
                var parsedFiles = ParseFilesFromStory(deviceScopedText);
                if (parsedFiles.Count > 0)
                {
                    device.Apps.Files ??= new GeneratedFilesApp();
                    var existing = device.Apps.Files.Items ?? new List<GeneratedFileItem>();
                    foreach (var parsed in parsedFiles)
                    {
                        if (existing.Any(e => e.Name.Equals(parsed.Name, StringComparison.OrdinalIgnoreCase)))
                            continue;
                        existing.Add(parsed);
                    }
                    device.Apps.Files.Items = existing;
                }
            }

            // Ensure file list is stable and complete: keep distinct by filename (case-insensitive).
            if (device.Apps.Files?.Items != null && device.Apps.Files.Items.Count > 0)
            {
                device.Apps.Files.Items = device.Apps.Files.Items
                    .GroupBy(f => f.Name ?? string.Empty, StringComparer.OrdinalIgnoreCase)
                    .Select(g =>
                    {
                        // Prefer entry with richer Description
                        return g.OrderByDescending(x => (x.Description ?? string.Empty).Length).First();
                    })
                    .Where(f => !string.IsNullOrWhiteSpace(f.Name))
                    .ToList();
            }

            RedistributeFlatEmails(device.Apps.Email, ownerName);
        }
    }

    /// <summary>
    /// Extracts a PIN from a raw text block using the standard regex.
    /// Returns null if none found.
    /// </summary>
    private static string? ExtractPinFromText(string text)
    {
        var pinRegex = new System.Text.RegularExpressions.Regex(
            @"(?:PIN|Passcode|Cod\s*PIN|parola|code|parolă)\s*[:\-=]?\s*(\d{4,6})\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var m = pinRegex.Match(text);
        return m.Success ? m.Groups[1].Value : null;
    }

    /// <summary>
    /// Searches for a PIN in a ±400-char window around the first occurrence of ownerName.
    /// This scopes the search tightly to avoid cross-device PIN leakage.
    /// </summary>
    private static string? ExtractPinNearOwner(string story, string ownerName)
    {
        if (string.IsNullOrWhiteSpace(ownerName)) return null;
        var idx = story.IndexOf(ownerName, StringComparison.OrdinalIgnoreCase);
        if (idx < 0) return null;

        int start = Math.Max(0, idx - 100);
        int end   = Math.Min(story.Length, idx + ownerName.Length + 400);
        var window = story.Substring(start, end - start);
        return ExtractPinFromText(window);
    }

    /// <summary>
    /// Splits the story text into blocks, one per DISPOZITIV / DEVICE section.
    /// Returns a list of (header line, block text) tuples.
    /// </summary>
    private static List<(string Header, string Block)> SplitIntoDeviceBlocks(string story)
    {
        var result = new List<(string, string)>();
        var lines = story.Split(new[] { '\r', '\n' }, StringSplitOptions.None);

        // Strict header pattern: only explicit device section headers.
        // Example: "DISPOZITIV 1 — iPhone (al Elodiei Ghinescu)"
        var headerRegex = new System.Text.RegularExpressions.Regex(
            @"^(?:[\p{So}\p{Sk}\p{P}\s]*)?(?:DISPOZITIV(?:UL)?|DEVICE)\s*\d+\b.*$",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        int start = -1;
        string header = "";
        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (line.Length > 4 && headerRegex.IsMatch(line))
            {
                if (start >= 0)
                    result.Add((header, string.Join("\n", lines[start..i])));
                start = i;
                header = line;
            }
        }
        if (start >= 0)
            result.Add((header, string.Join("\n", lines[start..])));

        return result;
    }

    /// <summary>
    /// Finds the device block that strictly matches BOTH ownerName AND deviceType,
    /// then extracts the PIN only from that block. Never falls back to full story.
    /// </summary>
    private static string? ExtractPinFromDeviceBlock(
        List<(string Header, string Block)> deviceBlocks,
        string ownerName,
        string deviceType)
    {
        if (deviceBlocks.Count == 0) return null;

        var pinRegex = new System.Text.RegularExpressions.Regex(
            @"(?:PIN|Passcode|Cod\s*PIN|parola|parolă|code)\s*[:\-=]?\s*(\d{4,6})\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        // Strict pass only: block must mention BOTH ownerName AND deviceType.
        foreach (var (header, block) in deviceBlocks)
        {
            bool matchesDevice = DoesBlockMatchDevice(header, block, ownerName, deviceType);
            bool matchesOwner = matchesDevice; // already validated together

            if (!matchesDevice || !matchesOwner) continue;

            var m = pinRegex.Match(block);
            if (m.Success) return m.Groups[1].Value;
        }

        return null;
    }

    /// <summary>
    /// Extract the section of the story that belongs to a specific character by name.
    /// </summary>
    private static string ExtractCharacterSection(string story, string ownerName)
    {
        if (string.IsNullOrWhiteSpace(ownerName) || string.IsNullOrWhiteSpace(story))
            return string.Empty;

        var lines = story.Split(new[] { '\r', '\n' }, StringSplitOptions.None);
        int startLine = -1;
        int endLine = lines.Length;

        for (int i = 0; i < lines.Length; i++)
        {
            var line = lines[i].Trim();
            if (line.Contains(ownerName, StringComparison.OrdinalIgnoreCase) &&
                (System.Text.RegularExpressions.Regex.IsMatch(line, @"^\d+\.\s") || line.StartsWith("#")))
            {
                startLine = i;
                for (int j = i + 1; j < lines.Length; j++)
                {
                    var nextLine = lines[j].Trim();
                    if (System.Text.RegularExpressions.Regex.IsMatch(nextLine, @"^\d+\.\s") && !nextLine.Contains(ownerName, StringComparison.OrdinalIgnoreCase))
                    {
                        endLine = j;
                        break;
                    }
                }
                break;
            }
        }

        if (startLine < 0)
            return string.Empty;

        return string.Join("\n", lines[startLine..endLine]);
    }

    /// <summary>
    /// If the AI placed emails in the flat Emails list but Inbox/Sent/Drafts are empty,
    /// redistribute based on From field.
    /// </summary>
    private static void RedistributeFlatEmails(GeneratedEmailApp? emailApp, string ownerName)
    {
        if (emailApp == null) return;
        var flat = emailApp.Emails;
        if (flat == null || flat.Count == 0) return;
        if ((emailApp.Inbox?.Count ?? 0) > 0 || (emailApp.Sent?.Count ?? 0) > 0 || (emailApp.Drafts?.Count ?? 0) > 0)
            return;

        emailApp.Inbox ??= new List<GeneratedEmail>();
        emailApp.Sent ??= new List<GeneratedEmail>();

        foreach (var email in flat)
        {
            if (string.Equals(email.From, ownerName, StringComparison.OrdinalIgnoreCase) ||
                email.From.Contains(ownerName, StringComparison.OrdinalIgnoreCase))
            {
                emailApp.Sent.Add(email);
            }
            else
            {
                emailApp.Inbox.Add(email);
            }
        }
    }

    private static List<GeneratedCall> ParseCallsFromStory(string story)
    {
        var result = new List<GeneratedCall>();
        if (string.IsNullOrWhiteSpace(story))
            return result;

        // Găsim secțiunea cu apeluri (căutăm emoji-ul 📞 sau textul „Lista completă de apeluri” sau "apeluri relevante")
        var idx = story.IndexOf("📞", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("Lista completă de apeluri", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("apeluri relevante", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("Apeluri", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            return result;

        var endIdx = new[]
        {
            story.IndexOf("MESAJE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("EMAIL", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("EMAIL-URI", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("POZE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FOTO", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FIȘIERE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FISIERE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTIȚE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTITE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("📧", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("📷", idx, StringComparison.OrdinalIgnoreCase)
        }
        .Where(i => i > idx)
        .DefaultIfEmpty(story.Length)
        .Min();

        var section = story.Substring(idx, endIdx - idx);

        // Normalize bullets and em-dash entries so that each item starts on its own line.
        // This makes the parser robust even when the entire "Mailuri" block is on a single line.
        section = section
            .Replace("• ", "\n• ")
            .Replace("•\t", "\n•\t")
            .Replace(" —", "\n— ")
            .Replace("\t—", "\n— ");

        var lines = section.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

        // 1) Table format — 6 OR 7 columns (audio file column is optional):
        // Tip | Număr/Nume | Data | Ora | Durată  [| Fișier Audio]
        // or numbered:
        // 1 | Efectuat | Mirela Dănilă | 22.10.2007 | 22:47 | 3 min 12 sec  [| Santaj_Mirela.mp3]
        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (!line.Contains('|'))
                continue;
            var parts = line.Split('|').Select(p => p.Trim()).ToArray();

            // Determine whether first column is a row number (numbered table) or a type string (unnumbered)
            bool numbered   = parts.Length >= 6 && int.TryParse(parts[0], out _);
            bool unnumbered = !numbered && parts.Length >= 5 && !string.IsNullOrWhiteSpace(parts[0]);

            if (!numbered && !unnumbered)
                continue;

            string tip, contact, date, hour, duration, audioFileRaw;
            if (numbered)
            {
                tip          = parts[1];
                contact      = parts[2];
                date         = parts[3];
                hour         = parts[4];
                duration     = parts[5];
                audioFileRaw = parts.Length >= 7 ? parts[6] : string.Empty;
            }
            else
            {
                tip          = parts[0];
                contact      = parts[1];
                date         = parts[2];
                hour         = parts[3];
                duration     = parts[4];
                audioFileRaw = parts.Length >= 6 ? parts[5] : string.Empty;
            }

            var isIncoming = tip.Contains("Primit", StringComparison.OrdinalIgnoreCase);
            var isMissed   = tip.Contains("Pierdut", StringComparison.OrdinalIgnoreCase);
            var isOutgoing = tip.Contains("Efectuat", StringComparison.OrdinalIgnoreCase);
            if (!isIncoming && !isOutgoing && !isMissed)
                continue;

            // Skip column header rows (e.g. "Tip", "Nr")
            if (string.Equals(parts[0], "#", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(parts[0], "nr", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(tip, "tip", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(tip, "nr", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(contact, "contact", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(date, "data", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(hour, "ora", StringComparison.OrdinalIgnoreCase))
                continue;

            // "0740-888-999 (Mirela Dănilă)" -> "Mirela Dănilă"
            var mContact = System.Text.RegularExpressions.Regex.Match(contact, @"\(([^)]+)\)");
            if (mContact.Success) contact = mContact.Groups[1].Value.Trim();

            // Parse audio file name: "Santaj_Mirela.mp3" or "fisier : Santaj_Mirela.mp3"
            var audioFileName = string.Empty;
            var audioUrl      = string.Empty;
            if (!string.IsNullOrWhiteSpace(audioFileRaw) && audioFileRaw != "—")
            {
                var cleaned = System.Text.RegularExpressions.Regex.Replace(
                    audioFileRaw,
                    @"fi[sș]ier\s*[:\-]?\s*",
                    string.Empty,
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase).Trim();
                var fnMatch = System.Text.RegularExpressions.Regex.Match(
                    cleaned, @"[^\\/:*?""<>|\s]+\.(?:mp3|m4a|ogg|wav)",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (fnMatch.Success)
                {
                    audioFileName = fnMatch.Value.Trim();
                    audioUrl = $"upload-required://{audioFileName}?types=mp3";
                }
            }

            var typeStr = isMissed ? "Pierdut" : (isIncoming ? "Primit" : "Efectuat");

            result.Add(new GeneratedCall
            {
                Contact       = contact,
                Date          = (date == "—" ? string.Empty : date),
                Time          = (hour == "—" ? string.Empty : hour),
                Duration      = duration == "—" ? "0 sec" : duration,
                IsIncoming    = isIncoming || isMissed,
                Answered      = !isMissed,
                Type          = typeStr,
                AudioFileName = audioFileName,
                AudioUrl      = audioUrl
            });
        }

        if (result.Count > 0)
            return result;

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (!line.StartsWith("•"))
                continue;

            // Eliminăm bullet-ul
            line = line.TrimStart('•').Trim();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            // Format așteptat: "20:52 — Apel primit de la Victor (2 secunde — respins)."
            var dashIdx = line.IndexOf('—');
            if (dashIdx < 0)
                dashIdx = line.IndexOf('-');
            if (dashIdx < 0)
                continue;

            var time = line.Substring(0, dashIdx).Trim();
            var rest = line.Substring(dashIdx + 1).Trim();

            bool isIncoming = rest.Contains("Apel primit", StringComparison.OrdinalIgnoreCase);
            bool isOutgoing = rest.Contains("Apel efectuat", StringComparison.OrdinalIgnoreCase) ||
                              rest.Contains("Apel către", StringComparison.OrdinalIgnoreCase);

            bool answered = true;
            if (rest.Contains("fără răspuns", StringComparison.OrdinalIgnoreCase) ||
                rest.Contains("nu a răspuns", StringComparison.OrdinalIgnoreCase) ||
                rest.Contains("respins", StringComparison.OrdinalIgnoreCase))
            {
                answered = false;
            }

            string contact = "Necunoscut";
            var fromIdx = rest.IndexOf("de la", StringComparison.OrdinalIgnoreCase);
            var toIdx = rest.IndexOf("către", StringComparison.OrdinalIgnoreCase);
            int nameStart = -1;
            if (fromIdx >= 0)
                nameStart = fromIdx + "de la".Length;
            else if (toIdx >= 0)
                nameStart = toIdx + "către".Length;

            if (nameStart >= 0 && nameStart < rest.Length)
            {
                var namePart = rest.Substring(nameStart).Trim();
                var parenIdx = namePart.IndexOf('(');
                if (parenIdx >= 0)
                    namePart = namePart.Substring(0, parenIdx);
                contact = namePart.Trim(' ', '„', '”', '"', '.');
                if (string.IsNullOrWhiteSpace(contact))
                    contact = "Necunoscut";
            }

            string duration = "";
            var openPar = rest.IndexOf('(');
            if (openPar >= 0)
            {
                var closePar = rest.IndexOf(')', openPar + 1);
                if (closePar > openPar)
                    duration = rest.Substring(openPar + 1, closePar - openPar - 1).Trim();
            }
            if (string.IsNullOrWhiteSpace(duration))
                duration = answered ? "" : "0 sec";

            // Dacă nu putem determina clar sensul, presupunem incoming pentru mențiuni „apel primit”
            if (!isIncoming && !isOutgoing)
                isIncoming = true;

            result.Add(new GeneratedCall
            {
                Contact = contact,
                Date = string.Empty,
                Time = time,
                Duration = duration,
                IsIncoming = isIncoming,
                Answered = answered,
                Type = answered ? (isIncoming ? "Primit" : "Efectuat") : "Pierdut",
                AudioUrl = string.Empty,
                AudioFileName = string.Empty
            });
        }

        return result;
    }

    private static string ExtractDeviceBlockText(
        List<(string Header, string Block)> deviceBlocks,
        string ownerName,
        string deviceType)
    {
        if (deviceBlocks.Count == 0) return string.Empty;

        // Strict match only; never owner-only fallback to avoid data leaking across devices.
        foreach (var (header, block) in deviceBlocks)
        {
            bool matchesDevice = DoesBlockMatchDevice(header, block, ownerName, deviceType);
            bool matchesOwner = matchesDevice; // already validated together
            if (matchesDevice && matchesOwner)
                return block;
        }

        return string.Empty;
    }

    private static List<GeneratedConversation> ParseMessagesFromStory(string story, string ownerName)
    {
        var result = new Dictionary<string, GeneratedConversation>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(story))
            return new List<GeneratedConversation>();

        // Restrict to MESSAGES section to avoid cross-contamination from calls/emails/photos
        var text = story;
        var start = story.IndexOf("MESAJE", StringComparison.OrdinalIgnoreCase);
        if (start < 0) start = story.IndexOf("Messages", StringComparison.OrdinalIgnoreCase);
        if (start < 0) start = story.IndexOf("💬", StringComparison.OrdinalIgnoreCase);
        if (start >= 0)
        {
            var endCandidates = new[]
            {
                story.IndexOf("EMAIL", start, StringComparison.OrdinalIgnoreCase),
                story.IndexOf("EMAIL-URI", start, StringComparison.OrdinalIgnoreCase),
                story.IndexOf("POZE", start, StringComparison.OrdinalIgnoreCase),
                story.IndexOf("FISIERE", start, StringComparison.OrdinalIgnoreCase),
                story.IndexOf("FIȘIERE", start, StringComparison.OrdinalIgnoreCase),
                story.IndexOf("APELURI", start, StringComparison.OrdinalIgnoreCase)
            }.Where(i => i > start).OrderBy(i => i).ToList();
            var end = endCandidates.Count > 0 ? endCandidates[0] : story.Length;
            text = story.Substring(start, end - start);
        }

        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.None)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        string currentContact = "";
        GeneratedMessage? pendingMessage = null;

        static GeneratedConversation GetOrCreateConversation(
            IDictionary<string, GeneratedConversation> conversations,
            string contact)
        {
            var normalizedContact = string.IsNullOrWhiteSpace(contact) ? "Contact necunoscut" : contact.Trim();
            if (!conversations.TryGetValue(normalizedContact, out var conv))
            {
                conv = new GeneratedConversation
                {
                    Contact = normalizedContact,
                    Avatar = "👤",
                    LastMessage = "",
                    Time = "",
                    Messages = new List<GeneratedMessage>()
                };
                conversations[normalizedContact] = conv;
            }

            return conv;
        }

        foreach (var line in lines)
        {
            // Contact headers: "Conversație cu: Mirela Dănilă"
            var header = System.Text.RegularExpressions.Regex.Match(
                line,
                @"^(?:Conversa(?:ție|tie)\s+cu|Chat\s+cu|Contact|Cu)\s*[:\-]\s*(.+)$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (header.Success)
            {
                currentContact = header.Groups[1].Value.Trim(' ', '.', ':', ';');
                continue;
            }

            // Main format A (brief):
            // [18.03.2026 — 19:00] TRIMIS: "Vânzarea se face mâine..."
            // [18.03.2026 — 19:15] PRIMIT: "Dacă semnezi..."
            var bracketedInline = System.Text.RegularExpressions.Regex.Match(
                line,
                @"^\[(?<date>[^\]]+)\]\s*(?<dir>PRIMIT|TRIMIS)\s*:\s*(?<content>.+)$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (bracketedInline.Success)
            {
                var timestamp      = bracketedInline.Groups["date"].Value.Trim();
                var direction      = bracketedInline.Groups["dir"].Value.Trim();
                var rawContent     = bracketedInline.Groups["content"].Value.Trim().Trim('"', '\u201e', '\u201d');
                var biIsOutgoing   = direction.Equals("TRIMIS", StringComparison.OrdinalIgnoreCase);
                var resolvedContact = currentContact.Length > 0 ? currentContact : "Contact necunoscut";
                var senderName     = biIsOutgoing ? ownerName : resolvedContact;
                var biConv = GetOrCreateConversation(result, resolvedContact);
                biConv.Messages.Add(new GeneratedMessage
                {
                    Sender = senderName,
                    Content = rawContent,
                    Timestamp = timestamp,
                    IsOutgoing = biIsOutgoing
                });
                continue;
            }

            // Main format B (two-line):
            // [22.10.2007 — 20:15] PRIMIT de la Mirela:
            // "text..."
            var bracketed = System.Text.RegularExpressions.Regex.Match(
                line,
                @"^\[(?<date>[^\]]+)\]\s*(?<dir>PRIMIT|TRIMIS)\s*(?:de la|de|c\u0103tre|catre)\s*(?<name>[^:]+):\s*$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (bracketed.Success)
            {
                var timestamp = bracketed.Groups["date"].Value.Trim();
                var direction = bracketed.Groups["dir"].Value.Trim();
                var name = bracketed.Groups["name"].Value.Trim();
                var bracketedIsOutgoing = direction.Equals("TRIMIS", StringComparison.OrdinalIgnoreCase);

                if (string.IsNullOrWhiteSpace(currentContact))
                    currentContact = name;

                pendingMessage = new GeneratedMessage
                {
                    Sender = bracketedIsOutgoing ? ownerName : name,
                    Content = "",
                    Timestamp = timestamp,
                    IsOutgoing = bracketedIsOutgoing
                };
                continue;
            }

            // Content line that belongs to previous bracketed header
            if (pendingMessage != null)
            {
                var pendingContent = line.Trim().Trim('"', '„', '”');
                if (!string.IsNullOrWhiteSpace(pendingContent))
                {
                    var conv = GetOrCreateConversation(result, currentContact);
                    pendingMessage.Content = pendingContent;
                    conv.Messages.Add(pendingMessage);
                }
                pendingMessage = null;
                continue;
            }

            // Fallback inline formats:
            // 20:31 — Elodia: text
            // TRIMIS către Mirela: text
            string sender = "";
            string content = "";
            string time = "";
            bool isOutgoing;

            var timedInline = System.Text.RegularExpressions.Regex.Match(
                line,
                @"^(?<time>\d{1,2}[:.]\d{2})\s*[—\-:]\s*(?<sender>[^:]+):\s*(?<content>.+)$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (timedInline.Success)
            {
                time = timedInline.Groups["time"].Value.Replace('.', ':');
                sender = timedInline.Groups["sender"].Value.Trim();
                content = timedInline.Groups["content"].Value.Trim();
                isOutgoing = sender.Equals(ownerName, StringComparison.OrdinalIgnoreCase);
                if (string.IsNullOrWhiteSpace(currentContact))
                    currentContact = isOutgoing ? "Contact" : sender;
            }
            else
            {
                var directed = System.Text.RegularExpressions.Regex.Match(
                    line,
                    @"^(?:TRIMIS\s*(?:către|catre)|Către|Catre)\s+(?<to>[^:]+):\s*(?<content>.+)$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (directed.Success)
                {
                    sender = ownerName;
                    content = directed.Groups["content"].Value.Trim();
                    isOutgoing = true;
                    if (string.IsNullOrWhiteSpace(currentContact))
                        currentContact = directed.Groups["to"].Value.Trim();
                }
                else
                {
                    var incoming = System.Text.RegularExpressions.Regex.Match(
                        line,
                        @"^(?:PRIMIT\s*de la|De la)\s+(?<from>[^:]+):\s*(?<content>.+)$",
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (!incoming.Success)
                        continue;

                    sender = incoming.Groups["from"].Value.Trim();
                    content = incoming.Groups["content"].Value.Trim();
                    isOutgoing = false;
                    if (string.IsNullOrWhiteSpace(currentContact))
                        currentContact = sender;
                }
            }

            if (string.IsNullOrWhiteSpace(content))
                continue;

            var existing = GetOrCreateConversation(result, currentContact);

            existing.Messages.Add(new GeneratedMessage
            {
                Sender = string.IsNullOrWhiteSpace(sender) ? (isOutgoing ? ownerName : existing.Contact) : sender,
                Content = content.Trim('"', '„', '”'),
                Timestamp = time,
                IsOutgoing = isOutgoing
            });
        }

        foreach (var conv in result.Values)
        {
            if (conv.Messages.Count == 0)
                continue;
            var last = conv.Messages[^1];
            conv.LastMessage = last.Content;
            conv.Time = last.Timestamp;
        }

        return result.Values.Where(c => c.Messages.Count > 0).ToList();
    }

    private static void ParseEmailsFromStory(string story, string ownerName, out List<GeneratedEmail> inbox, out List<GeneratedEmail> sent, out List<GeneratedEmail> drafts)
    {
        inbox = new List<GeneratedEmail>();
        sent = new List<GeneratedEmail>();
        drafts = new List<GeneratedEmail>();

        var idx = story.IndexOf("📧", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("EMAIL-URI", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("EMAIL", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("Mailuri:", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("Mailuri", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            idx = story.IndexOf("📧 Mailuri", StringComparison.OrdinalIgnoreCase);
        if (idx < 0)
            return;

        var endIdx = new[]
        {
            story.IndexOf("POZE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FOTO", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FIȘIERE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FISIERE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("MESAJE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("APELURI", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTIȚE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTITE", idx, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("📷", idx, StringComparison.OrdinalIgnoreCase)
        }
        .Where(i => i > idx)
        .DefaultIfEmpty(story.Length)
        .Min();

        var section = story.Substring(idx, endIdx - idx);

        var lines = section.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

        static bool IsEmailSectionBoundary(string line) =>
            line.Contains("POZE", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("FOTO", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("FIȘIERE", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("FISIERE", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("APELURI", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("MESAJE", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("NOTE", StringComparison.OrdinalIgnoreCase) ||
            line.StartsWith("DISPOZITIV", StringComparison.OrdinalIgnoreCase) ||
            line.StartsWith("DEVICE", StringComparison.OrdinalIgnoreCase);

        static string NormalizeAddressLabel(string value)
            => value.Trim().Trim('"', '„', '”');

        static bool IsLikelyOwnerEmail(string email, string owner)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(owner))
                return false;

            var normalizedEmail = NormalizeForComparison(email).Replace("@", " ").Replace(".", " ").Replace("-", " ").Replace("_", " ");
            var ownerTokens = NormalizeForComparison(owner)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length >= 3)
                .ToList();

            return ownerTokens.Count > 0 && ownerTokens.All(normalizedEmail.Contains);
        }

        GeneratedEmail? BuildStructuredEmail(int startIndex, out int consumedLines)
        {
            consumedLines = 0;
            if (startIndex >= lines.Length)
                return null;

            string from = string.Empty;
            string to = string.Empty;
            string date = string.Empty;
            string subject = string.Empty;
            var bodyLines = new List<string>();
            int i = startIndex;

            for (; i < lines.Length; i++)
            {
                var current = lines[i].Trim();
                if (string.IsNullOrWhiteSpace(current))
                    continue;
                if (IsEmailSectionBoundary(current) && i > startIndex)
                    break;

                if (current.StartsWith("De la:", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrWhiteSpace(from))
                        break;
                    from = NormalizeAddressLabel(current["De la:".Length..]);
                    continue;
                }

                if (current.StartsWith("Către:", StringComparison.OrdinalIgnoreCase) ||
                    current.StartsWith("Catre:", StringComparison.OrdinalIgnoreCase))
                {
                    var prefixLength = current.StartsWith("Către:", StringComparison.OrdinalIgnoreCase) ? "Către:".Length : "Catre:".Length;
                    to = NormalizeAddressLabel(current[prefixLength..]);
                    continue;
                }

                if (current.StartsWith("Data:", StringComparison.OrdinalIgnoreCase))
                {
                    date = NormalizeAddressLabel(current["Data:".Length..]);
                    continue;
                }

                if (current.StartsWith("Subiect:", StringComparison.OrdinalIgnoreCase))
                {
                    subject = NormalizeAddressLabel(current["Subiect:".Length..]);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(from))
                    break;

                bodyLines.Add(current);
            }

            if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(subject))
                return null;

            consumedLines = Math.Max(1, i - startIndex);
            var body = string.Join("\n", bodyLines).Trim().Trim('"', '„', '”');
            var preview = body.Length > 120 ? body[..120] : body;
            return new GeneratedEmail
            {
                From = from,
                To = to,
                Subject = subject,
                Body = body,
                Preview = preview,
                Time = date
            };
        }

        for (int i = 0; i < lines.Length; i++)
        {
            var structured = BuildStructuredEmail(i, out var consumedLines);
            if (structured == null)
                continue;

            if (IsLikelyOwnerEmail(structured.From, ownerName))
                sent.Add(structured);
            else
                inbox.Add(structured);

            i += Math.Max(0, consumedLines - 1);
        }

        if (inbox.Count > 0 || sent.Count > 0 || drafts.Count > 0)
            return;

        string mode = ""; // "sent", "drafts", "inbox"
        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            if (line.StartsWith("•", StringComparison.OrdinalIgnoreCase))
            {
                if (line.IndexOf("Trimise", StringComparison.OrdinalIgnoreCase) >= 0)
                    mode = "sent";
                else if (line.IndexOf("Draft", StringComparison.OrdinalIgnoreCase) >= 0 || line.IndexOf("Ciorne", StringComparison.OrdinalIgnoreCase) >= 0)
                    mode = "drafts";
                else if (line.IndexOf("Inbox", StringComparison.OrdinalIgnoreCase) >= 0 || line.IndexOf("mailuri primite", StringComparison.OrdinalIgnoreCase) >= 0)
                    mode = "inbox";
                continue;
            }

            if (!line.StartsWith("—"))
            {
                // Pentru Inbox, descriere de genul „4 mailuri primite de la ... intitulate: ...”
                if (mode == "inbox" && line.Contains("mailuri primite", StringComparison.OrdinalIgnoreCase))
                {
                    // Extract count and subject from lines like "4 mailuri primite de la ... intitulate: „În legătură cu partajul"."
                    var countMatch = System.Text.RegularExpressions.Regex.Match(line, @"(\d+)\s+mailuri primite", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    int count = 1;
                    if (countMatch.Success && int.TryParse(countMatch.Groups[1].Value, out var parsedCount))
                        count = parsedCount;

                    var subject = ExtractQuotedText(line);
                    if (string.IsNullOrWhiteSpace(subject))
                    {
                        var intitulateIdx = line.IndexOf("intitulate:", StringComparison.OrdinalIgnoreCase);
                        if (intitulateIdx >= 0)
                            subject = line.Substring(intitulateIdx + "intitulate:".Length).Trim(' ', '„', '”', '"', '.');
                    }

                    if (!string.IsNullOrWhiteSpace(subject))
                    {
                        for (int i = 0; i < count; i++)
                        {
                            inbox.Add(new GeneratedEmail
                            {
                                From = "Firmă de avocatură",
                                Subject = subject,
                                Preview = subject,
                                Time = ""
                            });
                        }
                    }
                    continue;
                }
            }

            if (mode == "sent" && line.StartsWith("—", StringComparison.OrdinalIgnoreCase))
            {
                // Exemplu: — 14:22 — Către Victor, titlu: „Documentele alea nu pot fi semnate”.
                var content = line.TrimStart('—').Trim();
                var dashIdx = content.IndexOf('—');
                if (dashIdx < 0) continue;
                var time = content.Substring(0, dashIdx).Trim();
                var rest = content.Substring(dashIdx + 1).Trim();

                string subject = ExtractQuotedText(rest);
                if (string.IsNullOrWhiteSpace(subject))
                {
                    var titluIdx = rest.IndexOf("titlu:", StringComparison.OrdinalIgnoreCase);
                    if (titluIdx >= 0)
                        subject = rest.Substring(titluIdx + "titlu:".Length).Trim(' ', '„', '”', '"', '.');
                    else
                        subject = rest;
                }

                sent.Add(new GeneratedEmail
                {
                    From = ownerName,
                    Subject = subject,
                    Preview = subject,
                    Time = time
                });
            }
            else if (mode == "drafts" && line.StartsWith("—", StringComparison.OrdinalIgnoreCase))
            {
                // Exemplu: — Mail netrimis către banca lor: „Vă rog opriți transferul din contul comun până luni.”
                var content = line.TrimStart('—').Trim();
                var subject = ExtractQuotedText(content);
                if (string.IsNullOrWhiteSpace(subject))
                    subject = content;

                drafts.Add(new GeneratedEmail
                {
                    From = ownerName,
                    Subject = subject,
                    Preview = subject,
                    Time = "Draft"
                });
            }
            else if (mode == "inbox" && line.StartsWith("„"))
            {
                // Exemplu: „În legătură cu partajul”.
                var subject = ExtractQuotedText(line);
                if (string.IsNullOrWhiteSpace(subject))
                    subject = line.Trim(' ', '„', '”', '"', '.');

                // Textul zice „4 mailuri primite ... intitulate: <subject>”
                if (!string.IsNullOrWhiteSpace(subject))
                {
                    inbox.Add(new GeneratedEmail
                    {
                        From = "Firmă de avocatură",
                        Subject = subject,
                        Preview = subject,
                        Time = ""
                    });
                }
            }
        }
    }

    private static List<GeneratedNote> ParseNotesFromStory(string story)
    {
        var notes = new List<GeneratedNote>();
        if (string.IsNullOrWhiteSpace(story))
            return notes;

        var sectionStart = new[]
        {
            story.IndexOf("NOTIȚE", StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTITE", StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTES", StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTE", StringComparison.OrdinalIgnoreCase)
        }
        .Where(i => i >= 0)
        .DefaultIfEmpty(-1)
        .Min();
        if (sectionStart < 0)
            return notes;

        var sectionEnd = new[]
        {
            story.IndexOf("POZE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FOTO", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FIȘIERE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FISIERE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("EMAIL", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("EMAIL-URI", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("APELURI", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("MESAJE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("DISPOZITIV", sectionStart + 1, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("DEVICE", sectionStart + 1, StringComparison.OrdinalIgnoreCase)
        }
        .Where(i => i > sectionStart)
        .DefaultIfEmpty(story.Length)
        .Min();

        var section = story.Substring(sectionStart, sectionEnd - sectionStart);
        var lines = section.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        for (int i = 1; i < lines.Count; i++)
        {
            var headerLine = lines[i];
            if (headerLine.Contains("POZE", StringComparison.OrdinalIgnoreCase) ||
                headerLine.Contains("FOTO", StringComparison.OrdinalIgnoreCase) ||
                headerLine.Contains("FIȘIERE", StringComparison.OrdinalIgnoreCase) ||
                headerLine.Contains("FISIERE", StringComparison.OrdinalIgnoreCase) ||
                headerLine.Contains("EMAIL", StringComparison.OrdinalIgnoreCase) ||
                headerLine.Contains("APELURI", StringComparison.OrdinalIgnoreCase) ||
                headerLine.Contains("MESAJE", StringComparison.OrdinalIgnoreCase))
                break;

            var structured = System.Text.RegularExpressions.Regex.Match(
                headerLine,
                @"^(?<title>.+?)\s*[—\-]\s*Data\s*:\s*(?<date>.+)$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            if (!structured.Success)
                continue;

            var title = structured.Groups["title"].Value.Trim();
            var time = structured.Groups["date"].Value.Trim();
            var contentLines = new List<string>();
            int j = i + 1;
            for (; j < lines.Count; j++)
            {
                var contentLine = lines[j];
                var isNextStructured = System.Text.RegularExpressions.Regex.IsMatch(
                    contentLine,
                    @"^.+?\s*[—\-]\s*Data\s*:\s*.+$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (isNextStructured ||
                    contentLine.Contains("POZE", StringComparison.OrdinalIgnoreCase) ||
                    contentLine.Contains("FOTO", StringComparison.OrdinalIgnoreCase) ||
                    contentLine.Contains("FIȘIERE", StringComparison.OrdinalIgnoreCase) ||
                    contentLine.Contains("FISIERE", StringComparison.OrdinalIgnoreCase) ||
                    contentLine.Contains("EMAIL", StringComparison.OrdinalIgnoreCase) ||
                    contentLine.Contains("APELURI", StringComparison.OrdinalIgnoreCase) ||
                    contentLine.Contains("MESAJE", StringComparison.OrdinalIgnoreCase))
                    break;

                contentLines.Add(contentLine.Trim('"', '„', '”'));
            }

            var content = string.Join("\n", contentLines).Trim();
            if (!string.IsNullOrWhiteSpace(content))
            {
                notes.Add(new GeneratedNote
                {
                    Title = title,
                    Content = content,
                    Time = time
                });
            }

            i = j - 1;
        }

        return notes;
    }

    private static (List<GeneratedPhoto> Photos, List<GeneratedFileItem> MediaFiles) ParseMediaRequirementsFromStory(string story)
    {
        var photos = new List<GeneratedPhoto>();
        var mediaFiles = new List<GeneratedFileItem>();
        if (string.IsNullOrWhiteSpace(story))
            return (photos, mediaFiles);

        var lines = story.Split(new[] { '\r', '\n' }, StringSplitOptions.None)
            .Select(l => l.Trim())
            .Where(l => !string.IsNullOrWhiteSpace(l))
            .ToList();

        var uploadMediaRegex = new System.Text.RegularExpressions.Regex(
            // Order matters: prefer longer extensions first (docx before doc, xlsx before xls)
            @"(?<name>[A-Za-z0-9ĂÂÎȘŞȚŢăâîșşțţ_\-\s]+?\.(?<ext>jpeg|jpg|png|mp3|wav|m4a|ogg|mp4|webm|pdf|docx|doc|xlsx|xls|txt))",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        bool inPhotosSection = false;
        bool inFilesSection = false;

        void AddFilePlaceholder(string fileName, string? description)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return;

            var normalizedName = fileName.Trim().Replace(',', '.');
            var extension = Path.GetExtension(normalizedName).TrimStart('.').ToLowerInvariant();
            var normalizedDescription = string.IsNullOrWhiteSpace(description) ? normalizedName : description.Trim();

            if (extension is "jpg" or "jpeg" or "png")
            {
                if (!photos.Any(p => p.Url.Contains(normalizedName, StringComparison.OrdinalIgnoreCase)))
                {
                    photos.Add(new GeneratedPhoto
                    {
                        Url = $"upload-required://{normalizedName}?types=jpg,jpeg,png&size=1080x1920",
                        Caption = normalizedDescription
                    });
                }

                return;
            }

            var type = extension switch
            {
                "mp4" or "webm" => "Video",
                "pdf" => "Document",
                _ => "Audio"
            };

            var uploadDescriptor = type switch
            {
                "Video" => $"upload-required://{normalizedName}?types=mp4,webm&size=1920x1080",
                "Document" => $"upload-required://{normalizedName}?types=pdf",
                _ => $"upload-required://{normalizedName}?types=mp3,wav,m4a,ogg&size=max-20mb"
            };

            if (!mediaFiles.Any(f => f.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase)))
            {
                mediaFiles.Add(new GeneratedFileItem
                {
                    Name = normalizedName,
                    Type = type,
                    Description = $"{uploadDescriptor} | {normalizedDescription}"
                });
            }
        }

        void AddRegularFile(string fileName, string? description)
        {
            if (string.IsNullOrWhiteSpace(fileName))
                return;

            var normalizedName = fileName.Trim().Replace(',', '.');
            if (mediaFiles.Any(f => f.Name.Equals(normalizedName, StringComparison.OrdinalIgnoreCase)))
                return;

            var extension = Path.GetExtension(normalizedName).TrimStart('.').ToLowerInvariant();
            var type = extension switch
            {
                "jpg" or "jpeg" or "png" => "Image",
                "mp3" or "wav" or "m4a" or "ogg" => "Audio",
                "mp4" or "webm" => "Video",
                _ => "Document"
            };

            mediaFiles.Add(new GeneratedFileItem
            {
                Name = normalizedName,
                Type = type,
                Description = description?.Trim() ?? string.Empty
            });
        }

        foreach (var line in lines)
        {
            if (line.Contains("POZE", StringComparison.OrdinalIgnoreCase) || line.Contains("FOTO", StringComparison.OrdinalIgnoreCase))
            {
                inPhotosSection = true;
                inFilesSection = false;
                continue;
            }

            if (line.Contains("FIȘIERE", StringComparison.OrdinalIgnoreCase) || line.Contains("FISIERE", StringComparison.OrdinalIgnoreCase))
            {
                inFilesSection = true;
                inPhotosSection = false;
                continue;
            }

            if (line.Contains("EMAIL", StringComparison.OrdinalIgnoreCase) ||
                line.Contains("MESAJE", StringComparison.OrdinalIgnoreCase) ||
                line.Contains("APELURI", StringComparison.OrdinalIgnoreCase) ||
                line.Contains("NOTE", StringComparison.OrdinalIgnoreCase))
            {
                inPhotosSection = false;
                inFilesSection = false;
            }

            if (inPhotosSection)
            {
                foreach (System.Text.RegularExpressions.Match match in uploadMediaRegex.Matches(line))
                    AddFilePlaceholder(match.Groups["name"].Value, line);
            }

            if (inFilesSection)
            {
                foreach (System.Text.RegularExpressions.Match match in uploadMediaRegex.Matches(line))
                    AddRegularFile(match.Groups["name"].Value, line);
            }

            if (line.Contains('|'))
            {
                var audioMatch = System.Text.RegularExpressions.Regex.Match(
                    line,
                    @"(?:(?:fi[sș]ier\s*[:\-]?\s*)|(?<=\|))\s*(?<name>[^\\/:*?""<>|\s]+\.(?:mp3|wav|m4a|ogg))\s*$",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (audioMatch.Success)
                    AddFilePlaceholder(audioMatch.Groups["name"].Value, $"Audio apel: {audioMatch.Groups["name"].Value}");
            }
        }

        return (photos, mediaFiles);
    }

    private static List<GeneratedFileItem> ParseFilesFromStory(string story)
    {
        var files = new List<GeneratedFileItem>();
        if (string.IsNullOrWhiteSpace(story))
            return files;

        var sectionStart = new[]
        {
            story.IndexOf("FIȘIERE", StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FISIERE", StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FILES", StringComparison.OrdinalIgnoreCase)
        }
        .Where(i => i >= 0)
        .DefaultIfEmpty(-1)
        .Min();
        if (sectionStart < 0)
            return files;

        var sectionEnd = new[]
        {
            story.IndexOf("EMAIL", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("EMAIL-URI", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("MESAJE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("APELURI", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTIȚE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("NOTITE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("POZE", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("FOTO", sectionStart, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("DISPOZITIV", sectionStart + 1, StringComparison.OrdinalIgnoreCase),
            story.IndexOf("DEVICE", sectionStart + 1, StringComparison.OrdinalIgnoreCase)
        }
        .Where(i => i > sectionStart)
        .DefaultIfEmpty(story.Length)
        .Min();

        var section = story.Substring(sectionStart, sectionEnd - sectionStart);
        var lines = section.Split(new[] { '\r', '\n' }, StringSplitOptions.None)
            .Select(l => l.Trim())
            .ToList();

        GeneratedFileItem? current = null;
        var desc = new List<string>();
        string? lastModified = null;

        void CommitCurrent()
        {
            if (current == null)
                return;

            var descText = string.Join(" ", desc.Where(x => !string.IsNullOrWhiteSpace(x))).Trim();
            if (!string.IsNullOrWhiteSpace(lastModified))
            {
                descText = string.IsNullOrWhiteSpace(descText)
                    ? $"Ultima modificare: {lastModified}"
                    : $"Ultima modificare: {lastModified}. {descText}";
            }
            current.Description = descText;
            files.Add(current);
            current = null;
            desc.Clear();
            lastModified = null;
        }

        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var fileMatch = System.Text.RegularExpressions.Regex.Match(
                line,
                // allow extra trailing annotations after filename (e.g. "Fișier: X.pdf (semnat digital)")
                @"^(?:Fi[sș]ier)\s*:\s*(?<name>[^\\/:*?""<>|]+?\.(?:docx|doc|pdf|xlsx|xls|csv|txt|jpg|jpeg|png|mp3|wav|m4a|ogg|mp4|webm))\b",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);

            if (fileMatch.Success)
            {
                CommitCurrent();
                var name = fileMatch.Groups["name"].Value.Trim();
                var ext = Path.GetExtension(name).TrimStart('.').ToLowerInvariant();
                var type = ext switch
                {
                    "jpg" or "jpeg" or "png" => "Image",
                    "mp3" or "wav" or "m4a" or "ogg" => "Audio",
                    "mp4" or "webm" => "Video",
                    _ => "Document"
                };
                current = new GeneratedFileItem
                {
                    Name = name,
                    Type = type,
                    Description = string.Empty
                };
                continue;
            }

            if (current == null)
                continue;

            var modifiedMatch = System.Text.RegularExpressions.Regex.Match(
                line,
                @"^Ultima\s+modificare\s*:\s*(?<value>.+)$",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (modifiedMatch.Success)
            {
                lastModified = modifiedMatch.Groups["value"].Value.Trim();
                continue;
            }

            desc.Add(line.Trim('"', '„', '”'));
        }

        CommitCurrent();

        // keep unique by filename
        return files
            .GroupBy(f => f.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.First())
            .ToList();
    }

    private static bool DoesBlockMatchDevice(string header, string block, string ownerName, string deviceType)
    {
        var normOwner = NormalizeForComparison(ownerName);
        var normType = NormalizeForComparison(deviceType);
        var normHeader = NormalizeForComparison(header);

        // 1) Strongest check: explicit owner in header, e.g. "(al Elodiei Ghinescu)" or "(al lui Cristian Cioacă)"
        if (TryExtractOwnerFromHeader(header, out var headerOwner))
        {
            var normHeaderOwner = NormalizeForComparison(headerOwner);
            bool ownerMatches = AreLikelySamePerson(normHeaderOwner, normOwner);
            bool typeMatches = normHeader.Contains(normType, StringComparison.Ordinal);
            if (ownerMatches && typeMatches) return true;
        }

        // 2) Fallback: header must contain device type and first owner token
        var ownerFirstToken = GetFirstNameToken(normOwner);
        bool fallbackTypeMatches = normHeader.Contains(normType, StringComparison.Ordinal)
            || NormalizeForComparison(block[..Math.Min(180, block.Length)]).Contains(normType, StringComparison.Ordinal);
        bool fallbackOwnerMatches = !string.IsNullOrWhiteSpace(ownerFirstToken) &&
            normHeader.Contains(ownerFirstToken, StringComparison.Ordinal);

        return fallbackTypeMatches && fallbackOwnerMatches;
    }

    private static bool TryExtractOwnerFromHeader(string header, out string owner)
    {
        // Examples:
        // DISPOZITIV 1 — iPhone (al Elodiei Ghinescu)
        // DISPOZITIV 2 — Iphone (al lui Cristian Cioacă)
        var m = System.Text.RegularExpressions.Regex.Match(
            header,
            @"\(\s*al(?:\s+lui)?\s+(?<owner>[^)]+)\)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        if (m.Success)
        {
            owner = m.Groups["owner"].Value.Trim();
            return !string.IsNullOrWhiteSpace(owner);
        }

        owner = string.Empty;
        return false;
    }

    private static string GetFirstNameToken(string normalizedName)
    {
        if (string.IsNullOrWhiteSpace(normalizedName)) return string.Empty;
        var parts = normalizedName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[0] : string.Empty;
    }

    private static bool AreLikelySamePerson(string normalizedA, string normalizedB)
    {
        if (string.IsNullOrWhiteSpace(normalizedA) || string.IsNullOrWhiteSpace(normalizedB))
            return false;
        if (normalizedA == normalizedB) return true;

        // Token overlap to tolerate Romanian inflections ("ELODIEI" vs "ELODIA")
        var aTokens = normalizedA.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var bTokens = normalizedB.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        bool firstTokenClose = aTokens.Length > 0 && bTokens.Length > 0 &&
            (aTokens[0].StartsWith(bTokens[0][..Math.Min(5, bTokens[0].Length)], StringComparison.Ordinal) ||
             bTokens[0].StartsWith(aTokens[0][..Math.Min(5, aTokens[0].Length)], StringComparison.Ordinal));

        bool anySurnameOverlap = aTokens.Skip(1).Any(at => bTokens.Skip(1).Any(bt => at == bt));
        return firstTokenClose && (anySurnameOverlap || aTokens.Length == 1 || bTokens.Length == 1);
    }

    private static string NormalizeForComparison(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return string.Empty;
        var normalized = s.Normalize(System.Text.NormalizationForm.FormD);
        var sb = new System.Text.StringBuilder();
        foreach (char c in normalized)
        {
            if (System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(System.Text.NormalizationForm.FormC).ToUpperInvariant();
    }

    private static string ExtractQuotedText(string text)
    {
        if (string.IsNullOrEmpty(text))
            return string.Empty;

        var startIdx = text.IndexOf('„');
        var endIdx = text.IndexOf('”', startIdx + 1);
        if (startIdx >= 0 && endIdx > startIdx)
        {
            return text.Substring(startIdx + 1, endIdx - startIdx - 1).Trim();
        }

        // fallback la ghilimele normale
        startIdx = text.IndexOf('"');
        endIdx = text.IndexOf('"', startIdx + 1);
        if (startIdx >= 0 && endIdx > startIdx)
            return text.Substring(startIdx + 1, endIdx - startIdx - 1).Trim();

        return string.Empty;
    }

    /// <summary>
    /// Creates the investigator's special Laptop and iPhone for a game.
    /// The Laptop contains investigative databases (suspects, interrogations, CCTV, city maps).
    /// The iPhone contains recorded phone calls with entities from the game.
    /// </summary>
    private async Task CreateInvestigatorDevicesAsync(int gameId, string gameTitle, List<string> characterNames)
    {
        var existingDevices = await _deviceRepository.FindAsync(d => d.GameId == gameId);
        bool hasInvLaptop = existingDevices.Any(d => (d.OwnerName?.Equals("Anchetator", StringComparison.OrdinalIgnoreCase) ?? false) && d.DeviceType == "Laptop");
        bool hasInvPhone = existingDevices.Any(d => (d.OwnerName?.Equals("Anchetator", StringComparison.OrdinalIgnoreCase) ?? false) && (d.DeviceType == "iPhone" || d.DeviceType == "Android"));

        if (!hasInvLaptop)
        {
            // Doar instanțializăm laptopul fizic gol, fără documente sau loguri baseline
            var laptop = new DigitalDevice
            {
                GameId = gameId,
                DeviceType = "Laptop",
                OwnerName = "Anchetator",
                UniqueUrl = Guid.NewGuid().ToString()
            };
            await _deviceRepository.AddAsync(laptop);
        }

        if (!hasInvPhone)
        {
            // Doar instanțializăm telefonul fizic gol, fără apeluri baseline
            var iphone = new DigitalDevice
            {
                GameId = gameId,
                DeviceType = "iPhone",
                OwnerName = "Anchetator",
                UniqueUrl = Guid.NewGuid().ToString()
            };
            await _deviceRepository.AddAsync(iphone);
        }
    }

    private static GameDto MapToDto(Game game)
    {
        return new GameDto
        {
            GameId = game.GameId,
            UserId = game.UserId,
            Title = game.Title,
            Description = game.Description,
            Story = game.Story,
            Solution = game.Solution,
            IsPublished = game.IsPublished,
            PriceRon = game.PriceRon,
            CreatedAt = game.CreatedAt,
            UpdatedAt = game.UpdatedAt,
            CharacterCount = game.Characters.Count,
            EvidenceCount = game.PhysicalEvidences.Count,
            DeviceCount = game.DigitalDevices.Count
        };
    }

    private static GameSummaryDto MapToSummaryDto(Game game)
    {
        return new GameSummaryDto
        {
            GameId = game.GameId,
            Title = game.Title,
            Description = game.Description,
            IsPublished = game.IsPublished,
            PriceRon = game.PriceRon,
            CreatedAt = game.CreatedAt,
            UpdatedAt = game.UpdatedAt,
            CharacterCount = game.Characters.Count,
            EvidenceCount = game.PhysicalEvidences.Count,
            DeviceCount = game.DigitalDevices.Count
        };
    }
}
