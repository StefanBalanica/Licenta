using TheInvestigation.Api.Models;

namespace TheInvestigation.Api.Repositories;

/// <summary>
/// Repository interface for User entity with custom methods
/// </summary>
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<bool> EmailExistsAsync(string email);
}
