using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Models;
using MurderMystery.Api.Repositories;

namespace MurderMystery.Api.Controllers;

[ApiController]
[Route("api/games/{gameId}/characters")]
[Authorize]
public class CharactersController : ControllerBase
{
    private readonly IGameRepository _gameRepository;
    private readonly IRepository<Character> _characterRepository;
    private readonly ILogger<CharactersController> _logger;

    public CharactersController(
        IGameRepository gameRepository,
        IRepository<Character> characterRepository,
        ILogger<CharactersController> logger)
    {
        _gameRepository = gameRepository;
        _characterRepository = characterRepository;
        _logger = logger;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.Parse(userIdClaim!.Value);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CharacterDto>>> GetCharacters(int gameId)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var characters = await _characterRepository.FindAsync(c => c.GameId == gameId);
            return Ok(characters.Select(MapToDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving characters");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CharacterDto>> GetCharacter(int gameId, int id)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var character = await _characterRepository.GetByIdAsync(id);
            if (character == null || character.GameId != gameId)
                return NotFound();

            return Ok(MapToDto(character));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving character");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<CharacterDto>> CreateCharacter(int gameId, [FromBody] CreateCharacterDto dto)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var character = new Character
            {
                GameId = gameId,
                Name = dto.Name,
                Role = dto.Role,
                Description = dto.Description,
                Backstory = dto.Backstory,
                Motive = dto.Motive,
                Alibi = dto.Alibi
            };

            await _characterRepository.AddAsync(character);
            return CreatedAtAction(nameof(GetCharacter), new { gameId, id = character.CharacterId }, MapToDto(character));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating character");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CharacterDto>> UpdateCharacter(int gameId, int id, [FromBody] UpdateCharacterDto dto)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var character = await _characterRepository.GetByIdAsync(id);
            if (character == null || character.GameId != gameId)
                return NotFound();

            if (dto.Name != null) character.Name = dto.Name;
            if (dto.Role != null) character.Role = dto.Role;
            if (dto.Description != null) character.Description = dto.Description;
            if (dto.Backstory != null) character.Backstory = dto.Backstory;
            if (dto.Motive != null) character.Motive = dto.Motive;
            if (dto.Alibi != null) character.Alibi = dto.Alibi;

            await _characterRepository.UpdateAsync(character);
            return Ok(MapToDto(character));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating character");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteCharacter(int gameId, int id)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var character = await _characterRepository.GetByIdAsync(id);
            if (character == null || character.GameId != gameId)
                return NotFound();

            await _characterRepository.DeleteAsync(character);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting character");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    private static CharacterDto MapToDto(Character character)
    {
        return new CharacterDto
        {
            CharacterId = character.CharacterId,
            GameId = character.GameId,
            Name = character.Name,
            Role = character.Role,
            Description = character.Description,
            Backstory = character.Backstory,
            Motive = character.Motive,
            Alibi = character.Alibi,
            CreatedAt = character.CreatedAt
        };
    }
}
