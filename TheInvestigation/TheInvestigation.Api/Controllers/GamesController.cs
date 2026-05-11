using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Services;

namespace TheInvestigation.Api.Controllers;

/// <summary>
/// Controller for game management operations
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GamesController : ControllerBase
{
    private readonly IGameService _gameService;
    private readonly ILogger<GamesController> _logger;

    public GamesController(IGameService gameService, ILogger<GamesController> logger)
    {
        _gameService = gameService;
        _logger = logger;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    /// <summary>
    /// Get all games for the authenticated user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<GameSummaryDto>>> GetUserGames()
    {
        try
        {
            var userId = GetUserId();
            var games = await _gameService.GetUserGamesAsync(userId);
            return Ok(games);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user games");
            return StatusCode(500, new { message = "An error occurred while retrieving games" });
        }
    }

    /// <summary>
    /// Get a specific game by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<GameDto>> GetGame(int id)
    {
        try
        {
            var userId = GetUserId();
            var game = await _gameService.GetGameAsync(id, userId);
            return Ok(game);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving game {GameId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the game" });
        }
    }

    /// <summary>
    /// Generate a full game from a story using AI (Gemini): creates game, characters, devices and apps. Free tier: get key at https://aistudio.google.com/apikey
    /// </summary>
    [HttpPost("from-story")]
    public async Task<ActionResult<GameDto>> CreateGameFromStory([FromBody] GenerateFromStoryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request?.Story))
        {
            return BadRequest(new { message = "Story is required." });
        }
        try
        {
            var userId = GetUserId();
            var game = await _gameService.CreateGameFromStoryAsync(userId, request.Story.Trim(), cancellationToken);
            return CreatedAtAction(nameof(GetGame), new { id = game.GameId }, game);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating game from story");
            var msg = ex.Message;
            if (ex.InnerException != null) msg += " " + ex.InnerException.Message;
            return StatusCode(500, new { message = "Eroare la generare: " + msg });
        }
    }

    /// <summary>
    /// Create a new game
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<GameDto>> CreateGame([FromBody] CreateGameDto createGameDto)
    {
        try
        {
            var userId = GetUserId();
            var game = await _gameService.CreateGameAsync(userId, createGameDto);
            return CreatedAtAction(nameof(GetGame), new { id = game.GameId }, game);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating game");
            return StatusCode(500, new { message = "An error occurred while creating the game" });
        }
    }

    /// <summary>
    /// Update an existing game
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<GameDto>> UpdateGame(int id, [FromBody] UpdateGameDto updateGameDto)
    {
        try
        {
            var userId = GetUserId();
            var game = await _gameService.UpdateGameAsync(id, userId, updateGameDto);
            return Ok(game);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating game {GameId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the game" });
        }
    }

    /// <summary>
    /// Delete a game
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteGame(int id)
    {
        try
        {
            var userId = GetUserId();
            await _gameService.DeleteGameAsync(id, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting game {GameId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the game" });
        }
    }

    /// <summary>
    /// Publish a game (marketplace title and price in RON; appears on the public landing page).
    /// </summary>
    [HttpPost("{id}/publish")]
    public async Task<ActionResult<GameDto>> PublishGame(int id, [FromBody] PublishGameDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        try
        {
            var userId = GetUserId();
            var game = await _gameService.PublishGameAsync(id, userId, dto);
            return Ok(game);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing game {GameId}", id);
            return StatusCode(500, new { message = "An error occurred while publishing the game" });
        }
    }
}
