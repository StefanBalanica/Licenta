using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TheInvestigation.Api.Data;
using TheInvestigation.Api.Repositories;
using TheInvestigation.Api.Services;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Configure QuestPDF license (community license)
QuestPDF.Settings.License = LicenseType.Community;

// Handle both URL format (given by Render: postgresql://user:pass@host/db)
// and standard key-value format (local: Host=...;Port=...;...)
var rawConnection = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
var connectionString = rawConnection;
if (rawConnection.StartsWith("postgresql://") || rawConnection.StartsWith("postgres://"))
{
    // Manual parse — avoids Uri defaulting to port 443 when scheme is replaced with https://
    var withoutScheme = rawConnection.Contains("://") ? rawConnection[(rawConnection.IndexOf("://") + 3)..] : rawConnection;
    // withoutScheme = "user:password@host:port/database" OR "user:password@host/database"

    var atIndex = withoutScheme.IndexOf('@');
    var userInfoStr = withoutScheme[..atIndex];
    var rest = withoutScheme[(atIndex + 1)..];

    var userParts = userInfoStr.Split(':', 2);
    var user = Uri.UnescapeDataString(userParts[0]);
    var password = userParts.Length > 1 ? Uri.UnescapeDataString(userParts[1]) : "";

    var slashIndex = rest.IndexOf('/');
    var hostPort = slashIndex >= 0 ? rest[..slashIndex] : rest;
    var database = slashIndex >= 0 ? rest[(slashIndex + 1)..] : "";

    // Remove query string from database if present (e.g. ?sslmode=require)
    var queryIndex = database.IndexOf('?');
    if (queryIndex >= 0) database = database[..queryIndex];

    // Detect port — default to 5432 if not specified
    var colonIndex = hostPort.LastIndexOf(':');
    string host;
    int port;
    if (colonIndex >= 0 && int.TryParse(hostPort[(colonIndex + 1)..], out port))
    {
        host = hostPort[..colonIndex];
    }
    else
    {
        host = hostPort;
        port = 5432;
    }

    // Use SSL Mode=Prefer: tries SSL but falls back to plain (needed for Render internal connections)
    connectionString = $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Prefer;Trust Server Certificate=true";
}

// Add DbContext
builder.Services.AddDbContext<TheInvestigationDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IGameRepository, GameRepository>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Add services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGameService, GameService>();
builder.Services.AddScoped<IStoryToGameService, StoryToGameService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<EmailService>(); // needed for Gmail API HTTP calls
builder.Services.AddHttpClient<StoryToGameService>();
builder.Services.AddSingleton<IQRCodeService, QRCodeService>();
builder.Services.AddSingleton<PdfGenerationService>();
builder.Services.AddScoped<IChatbotService, ChatbotService>();
builder.Services.AddHttpClient<ChatbotService>();

// Add controllers
builder.Services.AddControllers();

// Configure JWT authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

// Configure CORS
var frontendUrl = builder.Configuration["AppSettings:FrontendUrl"] ?? "http://localhost:4200";
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "http://localhost:4201",
                "https://murdermystery-client.onrender.com",
                "https://the-investigation.onrender.com",
                frontendUrl
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "The Investigation API", Version = "v1" });
    
    // Add JWT authentication to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// NOTE: UseHttpsRedirection is intentionally omitted.
// Render handles HTTPS termination at the proxy level; enabling it here causes redirect loops.

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Apply migrations and ensure schema consistency.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TheInvestigationDbContext>();
    db.Database.Migrate();

    // Safety net: ensure PasswordResetTokens exists even if migration history is inconsistent.
    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""PasswordResetTokens"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""UserId"" INTEGER NOT NULL,
            ""TokenHash"" VARCHAR(64) NOT NULL,
            ""ExpiresAt"" TIMESTAMP WITH TIME ZONE NOT NULL,
            ""IsUsed"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            CONSTRAINT ""FK_PasswordResetTokens_Users_UserId""
                FOREIGN KEY (""UserId"") REFERENCES ""Users"" (""UserId"") ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_PasswordResetTokens_TokenHash""
            ON ""PasswordResetTokens"" (""TokenHash"");
        CREATE INDEX IF NOT EXISTS ""IX_PasswordResetTokens_UserId""
            ON ""PasswordResetTokens"" (""UserId"");
    ");
}

app.Run();

// Needed for integration tests (WebApplicationFactory)
public partial class Program { }

