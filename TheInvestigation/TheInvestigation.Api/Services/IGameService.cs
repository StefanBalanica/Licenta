using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Models;

namespace TheInvestigation.Api.Services;

/// <summary>
/// Service interface for game management operations
/// </summary>
public interface IGameService
{
    Task<GameDto> CreateGameAsync(int userId, CreateGameDto createGameDto);
    Task<GameDto> GetGameAsync(int gameId, int userId);
    Task<IEnumerable<GameSummaryDto>> GetUserGamesAsync(int userId);
    Task<GameDto> UpdateGameAsync(int gameId, int userId, UpdateGameDto updateGameDto);
    Task DeleteGameAsync(int gameId, int userId);
    Task<GameDto> PublishGameAsync(int gameId, int userId, PublishGameDto dto);
    Task<GameDto> UnpublishGameAsync(int gameId, int userId);

    /// <summary>
    /// Generates a full game from a story using AI (Gemini): creates game, characters, devices and apps.
    /// </summary>
    Task<GameDto> CreateGameFromStoryAsync(int userId, string story, CancellationToken cancellationToken = default);
}
