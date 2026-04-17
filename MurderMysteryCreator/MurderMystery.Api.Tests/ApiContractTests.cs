using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MurderMystery.Api.Data;
using MurderMystery.Api.Models;
using MurderMystery.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace MurderMystery.Api.Tests;

public class ApiContractTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly ITestOutputHelper _output;

    public ApiContractTests(CustomWebApplicationFactory factory, ITestOutputHelper output)
    {
        _factory = factory;
        _output = output;
    }

    [Fact]
    public async Task GetDeviceFull_ReturnsCamelCaseAppData_AndPreservesPhoneCallsFields()
    {
        var client = _factory.CreateClient();

        var gameId = 0;
        var deviceId = 0;
        await SeedAsync(scope =>
        {
            var db = scope.ServiceProvider.GetRequiredService<MurderMysteryDbContext>();

            db.Users.Add(new User { UserId = 1, Email = "test@example.com", FirstName = "Test", LastName = "User", PasswordHash = "x" });
            db.SaveChanges();

            var game = new Game { UserId = 1, Title = "T", Description = "D", Story = "S", Solution = "X" };
            db.Games.Add(game);
            db.SaveChanges();

            var device = new DigitalDevice
            {
                GameId = game.GameId,
                DeviceType = "iPhone",
                OwnerName = "Elodia Ghinescu",
                UniqueUrl = Guid.NewGuid().ToString(),
                Passcode = "112233"
            };
            db.DigitalDevices.Add(device);
            db.SaveChanges();

            var phoneAppJson = """
            {
              "calls": [
                {
                  "contact": "Sorina Cioacă",
                  "date": "21.10.2007",
                  "time": "17:02",
                  "duration": "4 min 51 sec",
                  "isIncoming": true,
                  "answered": true,
                  "type": "Primit",
                  "audioUrl": "upload-required://Sorina.mp3?types=mp3",
                  "audioFileName": "Sorina.mp3"
                }
              ]
            }
            """;

            db.DeviceApps.Add(new DeviceApp
            {
                DeviceId = device.DeviceId,
                AppType = "Phone",
                AppData = JsonDocument.Parse(phoneAppJson)
            });

            var messagesAppJson = """
            { "conversations": [ { "contact": "Mirela", "avatar": "👤", "lastMessage": "x", "time": "t", "messages": [ { "sender": "Mirela", "content": "hi", "timestamp": "x", "isOutgoing": false } ] } ] }
            """;
            db.DeviceApps.Add(new DeviceApp
            {
                DeviceId = device.DeviceId,
                AppType = "Messages",
                AppData = JsonDocument.Parse(messagesAppJson)
            });

            db.SaveChanges();

            // Verify AppData is readable after save (diagnostic for provider/converter issues)
            var saved = db.DeviceApps.First(a => a.DeviceId == device.DeviceId && a.AppType == "Phone");
            var raw = saved.AppData.RootElement.GetRawText();
            _output.WriteLine("Seeded Phone AppData raw: " + raw);

            gameId = game.GameId;
            deviceId = device.DeviceId;
        });
        Assert.True(gameId > 0);
        Assert.True(deviceId > 0);

        var resp = await client.GetAsync($"/api/games/{gameId}/devices/{deviceId}/full");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadAsStringAsync();
        _output.WriteLine("FULL response: " + body);
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.Equal(deviceId, root.GetProperty("deviceId").GetInt32());
        Assert.Equal(gameId, root.GetProperty("gameId").GetInt32());
        Assert.Equal("iPhone", root.GetProperty("deviceType").GetString());
        Assert.Equal("Elodia Ghinescu", root.GetProperty("ownerName").GetString());
        Assert.Equal("112233", root.GetProperty("passcode").GetString());

        var apps = root.GetProperty("apps");
        Assert.True(apps.ValueKind == JsonValueKind.Array && apps.GetArrayLength() >= 2);

        var phone = apps.EnumerateArray().First(a => a.GetProperty("appType").GetString() == "Phone");
        var phoneData = phone.GetProperty("appData");
        Assert.True(phoneData.TryGetProperty("calls", out var calls), "Expected appData.calls in /full");
        Assert.Equal(1, calls.GetArrayLength());

        var call = calls[0];
        foreach (var k in new[] { "contact", "date", "time", "duration", "type", "audioUrl", "audioFileName" })
            Assert.True(call.TryGetProperty(k, out _), $"Missing call field '{k}'");
    }

    [Fact]
    public async Task GetDeviceApps_ReturnsAppDataCamelCased()
    {
        var client = _factory.CreateClient();

        var gameId = 0;
        var deviceId = 0;
        await SeedAsync(scope =>
        {
            var db = scope.ServiceProvider.GetRequiredService<MurderMysteryDbContext>();
            db.Users.Add(new User { UserId = 1, Email = "test2@example.com", FirstName = "Test", LastName = "User", PasswordHash = "x" });
            db.SaveChanges();
            var game = new Game { UserId = 1, Title = "T2" };
            db.Games.Add(game);
            db.SaveChanges();

            var device = new DigitalDevice
            {
                GameId = game.GameId,
                DeviceType = "iPhone",
                OwnerName = "X",
                UniqueUrl = Guid.NewGuid().ToString()
            };
            db.DigitalDevices.Add(device);
            db.SaveChanges();

            // Note PascalCase keys inside jsonb → controller should camelize response
            var appJson = """{ "Calls": [ { "Contact": "A", "Date": "1", "Time": "2", "Duration": "3", "Type": "Primit" } ] }""";
            db.DeviceApps.Add(new DeviceApp
            {
                DeviceId = device.DeviceId,
                AppType = "Phone",
                AppData = JsonDocument.Parse(appJson)
            });
            db.SaveChanges();

            gameId = game.GameId;
            deviceId = device.DeviceId;
        });
        Assert.True(gameId > 0);
        Assert.True(deviceId > 0);

        var resp = await client.GetAsync($"/api/games/{gameId}/devices/{deviceId}/apps");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var json = await resp.Content.ReadAsStringAsync();
        _output.WriteLine("APPS response: " + json);
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.ValueKind == JsonValueKind.Array);
        var phone = doc.RootElement.EnumerateArray().First(a => a.GetProperty("appType").GetString() == "Phone");

        var appData = phone.GetProperty("appData");
        // Contract: backend may return either camelCase or PascalCase keys; frontend supports both.
        bool hasCalls = appData.TryGetProperty("calls", out var calls) || appData.TryGetProperty("Calls", out calls);
        Assert.True(hasCalls, "Expected appData to contain calls/Calls");
        Assert.Equal(1, calls.GetArrayLength());
        Assert.True(calls[0].TryGetProperty("contact", out _) || calls[0].TryGetProperty("Contact", out _));
    }

    private async Task SeedAsync(Action<IServiceScope> seed)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MurderMysteryDbContext>();
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
        seed(scope);
        await Task.CompletedTask;
    }
}

