using TheInvestigation.Api.DTOs;

namespace TheInvestigation.Api.Services;

/// <summary>
/// Uses a free AI (Google Gemini) to turn a raw story into structured game data: title, story, solution, characters, devices with apps.
/// </summary>
public interface IStoryToGameService
{
    /// <summary>
    /// Sends the story to the AI and returns structured data to create a game (characters + devices with messages, photos, emails, notes).
    /// </summary>
    Task<GeneratedGameData> GenerateFromStoryAsync(string story, CancellationToken cancellationToken = default);
}
