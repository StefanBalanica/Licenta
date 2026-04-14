using System.Text;
using System.Text.Json;
using MurderMystery.Api.Models;
using MurderMystery.Api.Repositories;

namespace MurderMystery.Api.Services;

/// <summary>
/// AI validation service implementation using Claude API
/// </summary>
public class AIValidationService : IAIValidationService
{
    private readonly IGameRepository _gameRepository;
    private readonly IRepository<AIValidationResult> _validationRepository;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly ILogger<AIValidationService> _logger;

    public AIValidationService(
        IGameRepository gameRepository,
        IRepository<AIValidationResult> validationRepository,
        IConfiguration configuration,
        HttpClient httpClient,
        ILogger<AIValidationService> logger)
    {
        _gameRepository = gameRepository;
        _validationRepository = validationRepository;
        _configuration = configuration;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<AIValidationResult> ValidateGameConsistencyAsync(int gameId)
    {
        try
        {
            // Fetch game with all details
            var game = await _gameRepository.GetGameWithDetailsAsync(gameId);
            if (game == null)
            {
                throw new KeyNotFoundException($"Game {gameId} not found");
            }

            // Prepare prompt for Claude
            var prompt = BuildValidationPrompt(game);

            // Call Claude API (simplified - in production use Anthropic.SDK properly)
            var apiKey = _configuration["AnthropicSettings:ApiKey"];
            var response = await CallClaudeAPI(prompt, apiKey!);

            // Parse response
            var issues = ParseValidationResponse(response);
            var score = CalculateConsistencyScore(issues);

            // Save validation result
            var validation = new AIValidationResult
            {
                GameId = gameId,
                ConsistencyScore = score,
                Issues = JsonDocument.Parse(JsonSerializer.Serialize(issues))
            };

            await _validationRepository.AddAsync(validation);

            return validation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating game {GameId}", gameId);
            throw;
        }
    }

    private string BuildValidationPrompt(Game game)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Please analyze this murder mystery game for consistency and provide feedback:");
        sb.AppendLine();
        sb.AppendLine($"Title: {game.Title}");
        sb.AppendLine($"Story: {game.Story}");
        sb.AppendLine($"Solution: {game.Solution}");
        sb.AppendLine();
        sb.AppendLine("Characters:");
        foreach (var character in game.Characters)
        {
            sb.AppendLine($"- {character.Name} ({character.Role})");
            sb.AppendLine($"  Motive: {character.Motive}");
            sb.AppendLine($"  Alibi: {character.Alibi}");
        }
        sb.AppendLine();
        sb.AppendLine("Please check for:");
        sb.AppendLine("1. Plot holes or inconsistencies");
        sb.AppendLine("2. Character motivation issues");
        sb.AppendLine("3. Timeline problems");
        sb.AppendLine("4. Logic errors");
        sb.AppendLine();
        sb.AppendLine("Respond in JSON format:");
        sb.AppendLine("{ \"issues\": [ { \"type\": \"string\", \"description\": \"string\", \"severity\": \"high|medium|low\" } ] }");

        return sb.ToString();
    }

    private async Task<string> CallClaudeAPI(string prompt, string apiKey)
    {
        // Simplified Claude API call - in production, use Anthropic.SDK
        // For now, return mock response
        await Task.Delay(100); // Simulate API call

        return @"{
            ""issues"": [
                {
                    ""type"": ""timeline"",
                    ""description"": ""The story mentions the event happened at 8 PM, but a character's alibi places them somewhere else at 9 PM without explaining the time gap"",
                    ""severity"": ""medium""
                }
            ]
        }";
    }

    private List<object> ParseValidationResponse(string response)
    {
        try
        {
            var json = JsonDocument.Parse(response);
            var issues = new List<object>();
            
            if (json.RootElement.TryGetProperty("issues", out var issuesArray))
            {
                foreach (var issue in issuesArray.EnumerateArray())
                {
                    issues.Add(new
                    {
                        type = issue.GetProperty("type").GetString(),
                        description = issue.GetProperty("description").GetString(),
                        severity = issue.GetProperty("severity").GetString()
                    });
                }
            }

            return issues;
        }
        catch
        {
            return new List<object>();
        }
    }

    private decimal CalculateConsistencyScore(List<object> issues)
    {
        if (issues.Count == 0) return 100m;
        
        // Simple scoring: subtract points based on severity
        decimal score = 100m;
        foreach (dynamic issue in issues)
        {
            score -= issue.severity switch
            {
                "high" => 15m,
                "medium" => 10m,
                "low" => 5m,
                _ => 5m
            };
        }

        return Math.Max(0, score);
    }
}
