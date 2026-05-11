using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TheInvestigation.Api.Data;

namespace TheInvestigation.Api.Controllers;

/// <summary>
/// Public stats endpoint — no authentication required.
/// Returns live counts and public games for the landing page.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class StatsController : ControllerBase
{
    private readonly TheInvestigationDbContext _context;

    public StatsController(TheInvestigationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// GET /api/stats — Returns live platform statistics.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetStats()
    {
        var userCount = await _context.Users.CountAsync();
        var gameCount = await _context.Games.CountAsync(g => g.IsPublished);

        return Ok(new
        {
            userCount,
            gameCount,
            updatedAt = DateTime.UtcNow
        });
    }

    /// <summary>
    /// GET /api/stats/public-games — Returns all games marked as published,
    /// with creator first name, last name, title, description and date.
    /// </summary>
    [HttpGet("public-games")]
    public async Task<IActionResult> GetPublicGames()
    {
        var games = await _context.Games
            .Where(g => g.IsPublished)
            .Include(g => g.User)
            .OrderByDescending(g => g.UpdatedAt)
            .Select(g => new
            {
                g.GameId,
                g.Title,
                g.Description,
                CreatorName = g.User.FirstName + " " + g.User.LastName,
                CreatedAt = g.CreatedAt.ToString("yyyy-MM-dd")
            })
            .ToListAsync();

        return Ok(games);
    }
}

