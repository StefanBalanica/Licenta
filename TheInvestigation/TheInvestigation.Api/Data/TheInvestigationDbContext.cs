using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using TheInvestigation.Api.Models;

namespace TheInvestigation.Api.Data;

/// <summary>
/// Database context for Murder Mystery Game Creator
/// </summary>
public class TheInvestigationDbContext : DbContext
{
    public TheInvestigationDbContext(DbContextOptions<TheInvestigationDbContext> options)
        : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Game> Games { get; set; } = null!;
    public DbSet<Character> Characters { get; set; } = null!;
    public DbSet<PhysicalEvidence> PhysicalEvidences { get; set; } = null!;
    public DbSet<DigitalDevice> DigitalDevices { get; set; } = null!;
    public DbSet<DeviceApp> DeviceApps { get; set; } = null!;
    public DbSet<AIValidationResult> AIValidationResults { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // For non-Npgsql providers (e.g. test InMemory/SQLite), JsonDocument needs a converter.
        // Npgsql supports JsonDocument natively via jsonb.
        bool isNpgsql = Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;
        var jsonOptions = default(JsonDocumentOptions);
        var jsonDocumentToString = new ValueConverter<JsonDocument, string>(
            v => v.RootElement.GetRawText(),
            v => JsonDocument.Parse(string.IsNullOrWhiteSpace(v) ? "{}" : v, jsonOptions));
        
        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Email).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.LastName).HasMaxLength(100).IsRequired();
        });

        // PasswordResetToken configuration
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TokenHash).IsUnique();
            entity.Property(e => e.TokenHash).HasMaxLength(64).IsRequired();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
        
        // Game configuration
        modelBuilder.Entity<Game>(entity =>
        {
            entity.HasKey(e => e.GameId);
            entity.HasOne(e => e.User)
                .WithMany(u => u.Games)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
        });
        
        // Character configuration
        modelBuilder.Entity<Character>(entity =>
        {
            entity.HasKey(e => e.CharacterId);
            entity.HasOne(e => e.Game)
                .WithMany(g => g.Characters)
                .HasForeignKey(e => e.GameId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(100);
        });
        
        // PhysicalEvidence configuration
        modelBuilder.Entity<PhysicalEvidence>(entity =>
        {
            entity.HasKey(e => e.EvidenceId);
            entity.HasOne(e => e.Game)
                .WithMany(g => g.PhysicalEvidences)
                .HasForeignKey(e => e.GameId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            var p = entity.Property(e => e.Content).IsRequired();
            if (isNpgsql)
                p.HasColumnType("jsonb");
            else
                p.HasConversion(jsonDocumentToString);
        });
        
        // DigitalDevice configuration
        modelBuilder.Entity<DigitalDevice>(entity =>
        {
            entity.HasKey(e => e.DeviceId);
            entity.HasOne(e => e.Game)
                .WithMany(g => g.DigitalDevices)
                .HasForeignKey(e => e.GameId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.DeviceType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.OwnerName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.UniqueUrl).HasMaxLength(500).IsRequired();
            entity.HasIndex(e => e.UniqueUrl).IsUnique();
        });
        
        // DeviceApp configuration
        modelBuilder.Entity<DeviceApp>(entity =>
        {
            entity.HasKey(e => e.AppId);
            entity.HasOne(e => e.DigitalDevice)
                .WithMany(d => d.DeviceApps)
                .HasForeignKey(e => e.DeviceId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.AppType).HasMaxLength(50).IsRequired();
            var p = entity.Property(e => e.AppData).IsRequired();
            if (isNpgsql)
                p.HasColumnType("jsonb");
            else
                p.HasConversion(jsonDocumentToString);
        });
        
        // AIValidationResult configuration
        modelBuilder.Entity<AIValidationResult>(entity =>
        {
            entity.HasKey(e => e.ValidationId);
            entity.HasOne(e => e.Game)
                .WithMany(g => g.AIValidationResults)
                .HasForeignKey(e => e.GameId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.ConsistencyScore).HasPrecision(5, 2);
            var p = entity.Property(e => e.Issues).IsRequired();
            if (isNpgsql)
                p.HasColumnType("jsonb");
            else
                p.HasConversion(jsonDocumentToString);
        });
    }
}
