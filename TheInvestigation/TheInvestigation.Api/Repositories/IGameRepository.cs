using TheInvestigation.Api.Models;

namespace TheInvestigation.Api.Repositories;

/// <summary>
/// Repository interface for Game entity with custom methods
/// </summary>
public interface IGameRepository : IRepository<Game>
{
    Task<IEnumerable<Game>> GetUserGamesAsync(int userId);
    Task<Game?> GetGameWithDetailsAsync(int gameId);
    Task<bool> UserOwnsGameAsync(int gameId, int userId);
}
