namespace TheInvestigation.Api.DTOs;

/// <summary>
/// DTO for creating a character
/// </summary>
public class CreateCharacterDto
{
    public required string Name { get; set; }
    public string? Role { get; set; }
    public string? Description { get; set; }
    public string? Backstory { get; set; }
    public string? Motive { get; set; }
    public string? Alibi { get; set; }
}

/// <summary>
/// DTO for updating a character
/// </summary>
public class UpdateCharacterDto
{
    public string? Name { get; set; }
    public string? Role { get; set; }
    public string? Description { get; set; }
    public string? Backstory { get; set; }
    public string? Motive { get; set; }
    public string? Alibi { get; set; }
}

/// <summary>
/// DTO for character response
/// </summary>
public class CharacterDto
{
    public int CharacterId { get; set; }
    public int GameId { get; set; }
    public required string Name { get; set; }
    public string? Role { get; set; }
    public string? Description { get; set; }
    public string? Backstory { get; set; }
    public string? Motive { get; set; }
    public string? Alibi { get; set; }
    public DateTime CreatedAt { get; set; }
}
