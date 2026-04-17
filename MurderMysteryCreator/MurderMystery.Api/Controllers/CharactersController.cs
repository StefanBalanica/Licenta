using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Models;
using MurderMystery.Api.Repositories;
using MurderMystery.Api.Services;

namespace MurderMystery.Api.Controllers;

[ApiController]
[Route("api/games/{gameId}/characters")]
[Authorize]
public class CharactersController : ControllerBase
{
    private readonly IGameRepository _gameRepository;
    private readonly IRepository<Character> _characterRepository;
    private readonly PdfGenerationService _pdfGenerationService;
    private readonly ILogger<CharactersController> _logger;

    public CharactersController(
        IGameRepository gameRepository,
        IRepository<Character> characterRepository,
        PdfGenerationService pdfGenerationService,
        ILogger<CharactersController> logger)
    {
        _gameRepository = gameRepository;
        _characterRepository = characterRepository;
        _pdfGenerationService = pdfGenerationService;
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

    [HttpPost("{id}/profile-pdf")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> GenerateCharacterProfilePdf(int gameId, int id, IFormFile? photo)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var character = await _characterRepository.GetByIdAsync(id);
            if (character == null || character.GameId != gameId)
                return NotFound(new { message = "Character not found" });

            if (photo == null || photo.Length == 0)
                return BadRequest(new { message = "Photo is required before generating profile PDF." });

            byte[] photoBytes;
            await using (var ms = new MemoryStream())
            {
                await photo.CopyToAsync(ms);
                photoBytes = ms.ToArray();
            }

            var occupation = ExtractOccupation(character.Description);
            var relationToVictim = ExtractRelationToVictim(character.Backstory, character.Description, character.Role);
            var pdfBytes = _pdfGenerationService.GenerateCharacterProfilePdf(
                fullName: character.Name,
                occupation: occupation,
                relationToVictim: relationToVictim,
                alibi: character.Alibi ?? string.Empty,
                motive: character.Motive ?? string.Empty,
                description: character.Description ?? string.Empty,
                backstory: character.Backstory ?? string.Empty,
                role: character.Role ?? "Unknown",
                profileImage: photoBytes);

            var safeName = character.Name.Replace(' ', '_');
            return File(pdfBytes, "application/pdf", $"SuspectProfile_{safeName}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating character profile PDF for character {CharacterId}", id);
            return StatusCode(500, new { message = "Failed to generate profile PDF." });
        }
    }

    private static string ExtractOccupation(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return "Unknown";

        var separators = new[] { ".", ",", ";", "|", "\n" };
        var firstChunk = description.Split(separators, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()?.Trim();
        return string.IsNullOrWhiteSpace(firstChunk) ? "Unknown" : firstChunk;
    }

    private static string ExtractRelationToVictim(string? backstory, string? description, string? role)
    {
        var source = $"{backstory} {description}".Trim();
        if (!string.IsNullOrWhiteSpace(source))
        {
            var marker = "rela";
            var index = source.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index >= 0)
            {
                var candidate = source[index..];
                var end = candidate.IndexOfAny(new[] { '.', '\n' });
                candidate = end > 0 ? candidate[..end] : candidate;
                if (!string.IsNullOrWhiteSpace(candidate))
                    return candidate.Trim();
            }
        }

        return !string.IsNullOrWhiteSpace(role) ? role : "Unknown";
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
