namespace MurderMystery.Api.DTOs;

/// <summary>
/// Request DTO for sending a chat message to the hint chatbot
/// </summary>
public class ChatMessageRequest
{
    /// <summary>
    /// The player's current message / question
    /// </summary>
    public required string Message { get; set; }

    /// <summary>
    /// Previous conversation turns so the model has context.
    /// Each entry is a JSON string: { "role": "user"|"assistant", "content": "..." }
    /// Kept client-side (stateless backend).
    /// </summary>
    public List<ChatHistoryEntry> ConversationHistory { get; set; } = new();
}

/// <summary>
/// A single turn in the conversation history
/// </summary>
public class ChatHistoryEntry
{
    /// <summary>"user" or "assistant"</summary>
    public required string Role { get; set; }

    public required string Content { get; set; }
}

/// <summary>
/// Response DTO returned by the chatbot endpoint
/// </summary>
public class ChatMessageResponse
{
    /// <summary>
    /// The assistant's reply / hint
    /// </summary>
    public required string Reply { get; set; }
}
