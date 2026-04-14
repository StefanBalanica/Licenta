using System.Text;
using System.Text.Json;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Repositories;

namespace MurderMystery.Api.Services;

/// <summary>
/// Game hint chatbot powered by Groq.
/// Knows the full game context but will NEVER reveal the killer / solution directly.
/// </summary>
public class ChatbotService : IChatbotService
{
    private readonly IGameRepository _gameRepository;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatbotService> _logger;

    private const string GroqChatEndpoint = "https://api.groq.com/openai/v1/chat/completions";

    public ChatbotService(
        IGameRepository gameRepository,
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<ChatbotService> logger)
    {
        _gameRepository = gameRepository;
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<ChatMessageResponse> GetHintAsync(int gameId, ChatMessageRequest request)
    {
        // 1. Load full game details
        var game = await _gameRepository.GetGameWithDetailsAsync(gameId)
            ?? throw new KeyNotFoundException($"Game {gameId} not found.");

        // 2. Build system prompt with game context (no solution included)
        var systemPrompt = BuildSystemPrompt(game);

        // 3. Build the messages array for the Groq API
        var messages = new List<object>
        {
            new { role = "system", content = systemPrompt }
        };

        // Append conversation history (max last 10 turns to stay within token limits)
        var recentHistory = request.ConversationHistory
            .TakeLast(10)
            .Select(h => new { role = h.Role, content = h.Content });
        messages.AddRange(recentHistory);

        // Append the new user message
        messages.Add(new { role = "user", content = request.Message });

        // 4. Call Groq API
        var groqApiKey = _configuration["GroqSettings:ApiKey"]
            ?? throw new InvalidOperationException("GroqSettings:ApiKey not configured.");
        var model = _configuration["GroqSettings:Model"] ?? "llama-3.1-8b-instant";

        var requestBody = new
        {
            model,
            messages,
            max_tokens = 300,
            temperature = 0.7
        };

        var jsonContent = new StringContent(
            JsonSerializer.Serialize(requestBody),
            Encoding.UTF8,
            "application/json");

        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {groqApiKey}");

        var response = await _httpClient.PostAsync(GroqChatEndpoint, jsonContent);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Groq API error {Status}: {Body}", response.StatusCode, responseBody);
            throw new Exception($"Groq API error: {response.StatusCode}");
        }

        // 5. Parse the assistant reply
        var reply = ParseGroqResponse(responseBody);

        return new ChatMessageResponse { Reply = reply };
    }

    // ──────────────────────────────────────────────────────────────────
    // Helpers
    // ──────────────────────────────────────────────────────────────────

    private static string BuildSystemPrompt(Models.Game game)
    {
        var sb = new StringBuilder();

        sb.AppendLine($"""
            You are a mysterious game master assistant for the murder mystery game "{game.Title}".
            You know ALL the details of this game, but you MUST NEVER reveal the killer or the solution directly.
            Your role is to give subtle, atmospheric hints that guide players toward discovering the truth themselves.
            Always respond in the same language the player uses.
            Keep your replies short – maximum 3 sentences.
            Do NOT use spoilers. Do NOT say who the killer is. Do NOT reveal the solution.
            """);

        sb.AppendLine("=== GAME CONTEXT ===");
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(game.Story))
        {
            sb.AppendLine("STORY:");
            sb.AppendLine(game.Story);
            sb.AppendLine();
        }

        if (game.Characters.Any())
        {
            sb.AppendLine("CHARACTERS:");
            foreach (var c in game.Characters)
            {
                sb.AppendLine($"- {c.Name} ({c.Role ?? "unknown role"})");
                if (!string.IsNullOrWhiteSpace(c.Motive))
                    sb.AppendLine($"  Motive: {c.Motive}");
                if (!string.IsNullOrWhiteSpace(c.Alibi))
                    sb.AppendLine($"  Alibi: {c.Alibi}");
                if (!string.IsNullOrWhiteSpace(c.Description))
                    sb.AppendLine($"  Description: {c.Description}");
            }
            sb.AppendLine();
        }

        if (game.PhysicalEvidences.Any())
        {
            sb.AppendLine("PHYSICAL EVIDENCE:");
            foreach (var e in game.PhysicalEvidences)
                sb.AppendLine($"- [{e.Type}] {e.Title}");
            sb.AppendLine();
        }

        if (game.DigitalDevices.Any())
        {
            sb.AppendLine("DIGITAL DEVICES:");
            foreach (var d in game.DigitalDevices)
                sb.AppendLine($"- {d.DeviceType} belonging to {d.OwnerName}");
            sb.AppendLine();
        }

        sb.AppendLine("=== END CONTEXT ===");
        sb.AppendLine();
        sb.AppendLine("""
            Remember: guide, don't spoil.
            A good hint points toward evidence or raises questions without confirming who the killer is.
            """);

        return sb.ToString();
    }

    private static string ParseGroqResponse(string json)
    {
        try
        {
            var doc = JsonDocument.Parse(json);
            return doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?? "Hmm… the shadows hold many secrets. Keep investigating.";
        }
        catch
        {
            return "Hmm… the shadows hold many secrets. Keep investigating.";
        }
    }
}
