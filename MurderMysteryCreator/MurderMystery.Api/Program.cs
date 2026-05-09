using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MurderMystery.Api.Data;
using MurderMystery.Api.Repositories;
using MurderMystery.Api.Services;
using QuestPDF.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Configure QuestPDF license (community license)
QuestPDF.Settings.License = LicenseType.Community;

// Handle both URL format (given by Render: postgresql://user:pass@host/db)
// and standard key-value format (local: Host=...;Port=...;...)
// Npgsql on Linux can SIGSEGV when parsing raw postgres:// URLs in some versions.
var rawConnection = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
var connectionString = rawConnection;
if (rawConnection.StartsWith("postgresql://") || rawConnection.StartsWith("postgres://"))
{
    var uri = new Uri(rawConnection.Replace("postgresql://", "https://").Replace("postgres://", "https://"));
    var userInfo = uri.UserInfo.Split(':', 2);
    var host = uri.Host;
    var port = uri.Port > 0 ? uri.Port : 5432;
    var database = uri.AbsolutePath.TrimStart('/');
    var user = Uri.UnescapeDataString(userInfo[0]);
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
    connectionString = $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true";
}

// Add DbContext
builder.Services.AddDbContext<MurderMysteryDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IGameRepository, GameRepository>();
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Add services
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGameService, GameService>();
builder.Services.AddScoped<IAIValidationService, AIValidationService>();
builder.Services.AddScoped<IStoryToGameService, StoryToGameService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddHttpClient<StoryToGameService>();
builder.Services.AddSingleton<IQRCodeService, QRCodeService>();
builder.Services.AddSingleton<PdfGenerationService>();
builder.Services.AddHttpClient<AIValidationService>();
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
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Murder Mystery Game Creator API", Version = "v1" });
    
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
    var db = scope.ServiceProvider.GetRequiredService<MurderMysteryDbContext>();
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

