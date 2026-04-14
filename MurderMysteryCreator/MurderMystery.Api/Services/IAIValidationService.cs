using MurderMystery.Api.Models;

namespace MurderMystery.Api.Services;

/// <summary>
/// Service for Claude AI-powered game validation
/// </summary>
public interface IAIValidationService
{
    Task<AIValidationResult> ValidateGameConsistencyAsync(int gameId);
}
