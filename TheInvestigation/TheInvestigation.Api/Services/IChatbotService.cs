using TheInvestigation.Api.DTOs;

namespace TheInvestigation.Api.Services;

public interface IChatbotService
{
    /// <summary>
    /// Sends a player's question to Groq with the game context and returns a hint.
    /// </summary>
    Task<ChatMessageResponse> GetHintAsync(int gameId, ChatMessageRequest request);
}
