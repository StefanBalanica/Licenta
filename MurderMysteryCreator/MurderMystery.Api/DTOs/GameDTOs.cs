namespace MurderMystery.Api.DTOs;

/// <summary>
/// DTO for creating a new game
/// </summary>
public class CreateGameDto
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public string? Story { get; set; }
    public string? Solution { get; set; }
}

/// <summary>
/// DTO for updating an existing game
/// </summary>
public class UpdateGameDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Story { get; set; }
    public string? Solution { get; set; }
}

/// <summary>
/// DTO for game response
/// </summary>
public class GameDto
{
    public int GameId { get; set; }
    public int UserId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public string? Story { get; set; }
    public string? Solution { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int CharacterCount { get; set; }
    public int EvidenceCount { get; set; }
    public int DeviceCount { get; set; }
}

/// <summary>
/// DTO for game list item (summary)
/// </summary>
public class GameSummaryDto
{
    public int GameId { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int CharacterCount { get; set; }
    public int EvidenceCount { get; set; }
    public int DeviceCount { get; set; }
}
