using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Models;
using TheInvestigation.Api.Repositories;

namespace TheInvestigation.Api.Controllers;

[ApiController]
[Route("api/games/{gameId}/devices/{deviceId}/apps")]
[Authorize]
public class DeviceAppsController : ControllerBase
{
    private readonly IGameRepository _gameRepository;
    private readonly IRepository<DigitalDevice> _deviceRepository;
    private readonly IRepository<DeviceApp> _appRepository;
    private readonly ILogger<DeviceAppsController> _logger;

    public DeviceAppsController(
        IGameRepository gameRepository,
        IRepository<DigitalDevice> deviceRepository,
        IRepository<DeviceApp> appRepository,
        ILogger<DeviceAppsController> logger)
    {
        _gameRepository = gameRepository;
        _deviceRepository = deviceRepository;
        _appRepository = appRepository;
        _logger = logger;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.Parse(userIdClaim!.Value);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DeviceAppDto>>> GetApps(int gameId, int deviceId)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(deviceId);
            if (device == null || device.GameId != gameId)
                return NotFound();

            var apps = await _appRepository.FindAsync(a => a.DeviceId == deviceId);
            return Ok(apps.Select(MapToDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving device apps");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("{appId}")]
    public async Task<ActionResult<DeviceAppDto>> GetApp(int gameId, int deviceId, int appId)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(deviceId);
            if (device == null || device.GameId != gameId)
                return NotFound();

            var app = await _appRepository.GetByIdAsync(appId);
            if (app == null || app.DeviceId != deviceId)
                return NotFound();

            return Ok(MapToDto(app));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving device app");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<DeviceAppDto>> CreateApp(int gameId, int deviceId, [FromBody] CreateDeviceAppDto dto)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(deviceId);
            if (device == null || device.GameId != gameId)
                return NotFound();

            // Serialize AppData to JsonDocument
            var jsonString = JsonSerializer.Serialize(dto.AppData);
            var jsonDocument = JsonDocument.Parse(jsonString);

            var app = new DeviceApp
            {
                DeviceId = deviceId,
                AppType = dto.AppType,
                AppData = jsonDocument
            };

            await _appRepository.AddAsync(app);
            return CreatedAtAction(nameof(GetApp), new { gameId, deviceId, appId = app.AppId }, MapToDto(app));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating device app");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPut("{appId}")]
    public async Task<ActionResult<DeviceAppDto>> UpdateApp(int gameId, int deviceId, int appId, [FromBody] UpdateDeviceAppDto dto)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(deviceId);
            if (device == null || device.GameId != gameId)
                return NotFound();

            var app = await _appRepository.GetByIdAsync(appId);
            if (app == null || app.DeviceId != deviceId)
                return NotFound();

            if (dto.AppData != null)
            {
                var jsonString = JsonSerializer.Serialize(dto.AppData);
                var jsonDocument = JsonDocument.Parse(jsonString);
                app.AppData = jsonDocument;
            }

            await _appRepository.UpdateAsync(app);
            return Ok(MapToDto(app));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating device app");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpDelete("{appId}")]
    public async Task<ActionResult> DeleteApp(int gameId, int deviceId, int appId)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(deviceId);
            if (device == null || device.GameId != gameId)
                return NotFound();

            var app = await _appRepository.GetByIdAsync(appId);
            if (app == null || app.DeviceId != deviceId)
                return NotFound();

            await _appRepository.DeleteAsync(app);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting device app");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    private static readonly JsonSerializerOptions CamelOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static DeviceAppDto MapToDto(DeviceApp app)
    {
        static JsonNode? CamelizeNode(JsonNode? node)
        {
            if (node == null) return null;
            if (node is JsonArray arr)
            {
                var outArr = new JsonArray();
                foreach (var item in arr)
                    outArr.Add(CamelizeNode(item));
                return outArr;
            }
            if (node is JsonObject obj)
            {
                var outObj = new JsonObject();
                foreach (var kv in obj)
                {
                    var key = kv.Key ?? "";
                    var camelKey = JsonNamingPolicy.CamelCase.ConvertName(key);
                    outObj[camelKey] = CamelizeNode(kv.Value);
                }
                return outObj;
            }
            return node;
        }

        object appData = new { };
        var raw = app.AppData.RootElement.GetRawText();
        try
        {
            var node = JsonNode.Parse(raw);
            var camel = CamelizeNode(node);
            appData = JsonSerializer.Deserialize<object>(camel?.ToJsonString() ?? raw) ?? appData;
        }
        catch
        {
            try { appData = JsonSerializer.Deserialize<object>(raw) ?? appData; } catch { /* keep empty */ }
        }

        return new DeviceAppDto
        {
            AppId = app.AppId,
            DeviceId = app.DeviceId,
            AppType = app.AppType,
            AppData = appData,
            CreatedAt = app.CreatedAt
        };
    }
}
