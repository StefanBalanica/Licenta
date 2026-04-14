using Microsoft.AspNetCore.Mvc;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Services;

namespace MurderMystery.Api.Controllers;

/// <summary>
/// Public chatbot endpoint – no auth required so players can access it via QR-code scanned device pages.
/// </summary>
[ApiController]
[Route("api/chatbot")]
public class ChatbotController : ControllerBase
{
    private readonly IChatbotService _chatbotService;
    private readonly ILogger<ChatbotController> _logger;

    public ChatbotController(IChatbotService chatbotService, ILogger<ChatbotController> logger)
    {
        _chatbotService = chatbotService;
        _logger = logger;
    }

    /// <summary>
    /// Send a message to the game-hint chatbot.
    /// The chatbot knows the game context (story, characters, evidence, devices)
    /// but will never reveal the killer or solution directly.
    /// </summary>
    /// <param name="gameId">ID of the murder mystery game being played</param>
    /// <param name="request">Player message + conversation history</param>
    [HttpPost("{gameId}/message")]
    [ProducesResponseType(typeof(ChatMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChatMessageResponse>> SendMessage(
        int gameId,
        [FromBody] ChatMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest("Message cannot be empty.");

        try
        {
            var response = await _chatbotService.GetHintAsync(gameId, request);
            return Ok(response);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Game {GameId} not found", gameId);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chatbot error for game {GameId}", gameId);
            return StatusCode(500, "The game master is temporarily unavailable. Try again shortly.");
        }
    }
}
