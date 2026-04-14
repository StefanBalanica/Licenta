using Microsoft.EntityFrameworkCore;
using MurderMystery.Api.Data;
using MurderMystery.Api.Models;

namespace MurderMystery.Api.Repositories;

/// <summary>
/// Repository implementation for Game entity
/// </summary>
public class GameRepository : Repository<Game>, IGameRepository
{
    public GameRepository(MurderMysteryDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Game>> GetUserGamesAsync(int userId)
    {
        return await _dbSet
            .Where(g => g.UserId == userId)
            .Include(g => g.Characters)
            .Include(g => g.PhysicalEvidences)
            .Include(g => g.DigitalDevices)
            .OrderByDescending(g => g.UpdatedAt)
            .ToListAsync();
    }

    public async Task<Game?> GetGameWithDetailsAsync(int gameId)
    {
        return await _dbSet
            .Include(g => g.Characters)
            .Include(g => g.PhysicalEvidences)
            .Include(g => g.DigitalDevices)
            .Include(g => g.AIValidationResults)
            .FirstOrDefaultAsync(g => g.GameId == gameId);
    }

    public async Task<bool> UserOwnsGameAsync(int gameId, int userId)
    {
        return await _dbSet.AnyAsync(g => g.GameId == gameId && g.UserId == userId);
    }
}
