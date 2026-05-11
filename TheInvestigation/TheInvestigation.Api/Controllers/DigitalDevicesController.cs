using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Models;
using TheInvestigation.Api.Repositories;
using TheInvestigation.Api.Services;

namespace TheInvestigation.Api.Controllers;

[ApiController]
[Route("api/games/{gameId}/devices")]
[Authorize]
public class DigitalDevicesController : ControllerBase
{
    private readonly IGameRepository _gameRepository;
    private readonly IRepository<DigitalDevice> _deviceRepository;
    private readonly IRepository<DeviceApp> _appRepository;
    private readonly IQRCodeService _qrCodeService;
    private readonly ILogger<DigitalDevicesController> _logger;
    private readonly IConfiguration _configuration;

    public DigitalDevicesController(
        IGameRepository gameRepository,
        IRepository<DigitalDevice> deviceRepository,
        IRepository<DeviceApp> appRepository,
        IQRCodeService qrCodeService,
        ILogger<DigitalDevicesController> logger,
        IConfiguration configuration)
    {
        _gameRepository = gameRepository;
        _deviceRepository = deviceRepository;
        _appRepository = appRepository;
        _qrCodeService = qrCodeService;
        _logger = logger;
        _configuration = configuration;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        return int.Parse(userIdClaim!.Value);
    }

    /// <summary>Removes diacritics and uppercases for comparison (matches frontend slug normalization)</summary>
    private static string NormalizeForComparison(string? s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (char c in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<DigitalDeviceDto>>> GetDevices(int gameId)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var devices = await _deviceRepository.FindAsync(d => d.GameId == gameId);
            return Ok(devices.Select(MapToDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving devices");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<DigitalDeviceDto>> GetDevice(int gameId, int id)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(id);
            if (device == null || device.GameId != gameId)
                return NotFound();

            return Ok(MapToDto(device));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving device");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<DigitalDeviceDto>> CreateDevice(int gameId, [FromBody] CreateDigitalDeviceDto dto)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = new DigitalDevice
            {
                GameId = gameId,
                DeviceType = dto.DeviceType,
                OwnerName = dto.OwnerName,
                Passcode = dto.Passcode,
                UniqueUrl = Guid.NewGuid().ToString()
            };

            await _deviceRepository.AddAsync(device);
            return CreatedAtAction(nameof(GetDevice), new { gameId, id = device.DeviceId }, MapToDto(device));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating device");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<DigitalDeviceDto>> UpdateDevice(int gameId, int id, [FromBody] UpdateDigitalDeviceDto dto)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(id);
            if (device == null || device.GameId != gameId)
                return NotFound();

            if (dto.DeviceType != null) device.DeviceType = dto.DeviceType;
            if (dto.OwnerName != null) device.OwnerName = dto.OwnerName;
            // Allow clearing passcode by setting to empty string; null = no change
            if (dto.Passcode != null) device.Passcode = dto.Passcode == "" ? null : dto.Passcode;

            await _deviceRepository.UpdateAsync(device);
            return Ok(MapToDto(device));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating device");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteDevice(int gameId, int id)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(id);
            if (device == null || device.GameId != gameId)
                return NotFound();

            await _deviceRepository.DeleteAsync(device);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting device");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("investigator")]
    public async Task<ActionResult<IEnumerable<DigitalDeviceDto>>> GetInvestigatorDevices(int gameId)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var devices = await _deviceRepository.FindAsync(d =>
                d.GameId == gameId &&
                d.OwnerName == "Anchetator");
            return Ok(devices.Select(MapToDto));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving investigator devices");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("by-slug")]
    public async Task<ActionResult<DigitalDeviceDto>> GetDeviceBySlug(int gameId, [FromQuery] string deviceType, [FromQuery] string ownerName)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            // Diacritic-insensitive + case-insensitive comparison (slug removes diacritics, DB may have "Ana Mureșan")
            var normDeviceType = NormalizeForComparison(deviceType);
            var normOwnerName = NormalizeForComparison(ownerName);
            var devices = await _deviceRepository.FindAsync(d => d.GameId == gameId);
            var device = devices.Where(d =>
                NormalizeForComparison(d.DeviceType) == normDeviceType &&
                NormalizeForComparison(d.OwnerName) == normOwnerName).ToList();

            var foundDevice = device.FirstOrDefault();
            if (foundDevice == null)
                return NotFound();

            return Ok(MapToDto(foundDevice));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving device by slug");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("{id}/full")]
    public async Task<ActionResult<DeviceWithAppsDto>> GetDeviceWithApps(int gameId, int id)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(id);
            if (device == null || device.GameId != gameId)
                return NotFound();

            var apps = await _appRepository.FindAsync(a => a.DeviceId == id);

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
                return node; // JsonValue
            }

            var deviceWithApps = new DeviceWithAppsDto
            {
                DeviceId = device.DeviceId,
                GameId = device.GameId,
                DeviceType = device.DeviceType,
                OwnerName = device.OwnerName,
                UniqueUrl = device.UniqueUrl,
                QRCodeUrl = device.QRCodeUrl,
                Passcode = device.Passcode,
                CreatedAt = device.CreatedAt,
                Apps = apps.Select(a =>
                {
                    object appData = new { };
                    var raw = a.AppData.RootElement.GetRawText();
                    try
                    {
                        var node = JsonNode.Parse(raw);
                        var camel = CamelizeNode(node);
                        appData = JsonSerializer.Deserialize<object>(camel?.ToJsonString() ?? raw) ?? appData;
                    }
                    catch
                    {
                        // Fallback: never lose appData in response
                        try { appData = JsonSerializer.Deserialize<object>(raw) ?? appData; } catch { /* keep empty */ }
                    }
                    return new DeviceAppDto
                    {
                        AppId = a.AppId,
                        DeviceId = a.DeviceId,
                        AppType = a.AppType,
                        AppData = appData,
                        CreatedAt = a.CreatedAt
                    };
                }).ToList()
            };

            return Ok(deviceWithApps);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving device with apps");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    [HttpGet("{id}/qr-pdf")]
    public async Task<IActionResult> DownloadQRCodePDF(int gameId, int id)
    {
        try
        {
            var userId = GetUserId();
            if (!await _gameRepository.UserOwnsGameAsync(gameId, userId))
                return Forbid();

            var device = await _deviceRepository.GetByIdAsync(id);
            if (device == null || device.GameId != gameId)
                return NotFound();

            // Get frontend base URL from configuration
            var frontendBaseUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:4200";

            // Build clean public URL: /{deviceSlug}  e.g. /iphone-elodia
            var deviceSlug = CreateDeviceSlug(device.DeviceType, device.OwnerName);
            var deviceUrl = $"{frontendBaseUrl}/{deviceSlug}";

            // Generate PDF with QR code
            var pdfBytes = _qrCodeService.GenerateQRCodePDF(deviceUrl, device.DeviceType, device.OwnerName, frontendBaseUrl);

            var fileName = $"QR-{device.DeviceType}-{device.OwnerName.Replace(" ", "-")}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code PDF: {Message}", ex.Message);
            _logger.LogError(ex, "Stack trace: {StackTrace}", ex.StackTrace);
            return StatusCode(500, new { message = $"An error occurred generating QR code PDF: {ex.Message}" });
        }
    }

    private static DigitalDeviceDto MapToDto(DigitalDevice device) => new()
    {
        DeviceId  = device.DeviceId,
        GameId    = device.GameId,
        DeviceType = device.DeviceType,
        OwnerName = device.OwnerName,
        UniqueUrl = device.UniqueUrl,
        QRCodeUrl = device.QRCodeUrl,
        Passcode  = device.Passcode,
        CreatedAt = device.CreatedAt
    };

    /// <summary>Generates a URL-friendly slug: "iPhone" + "Ana Mureșan" → "iphone-ana-muresan"</summary>
    private static string CreateDeviceSlug(string deviceType, string ownerName)
    {
        static string Slugify(string s)
        {
            var normalized = s.Normalize(NormalizationForm.FormD);
            var sb = new StringBuilder();
            foreach (char c in normalized)
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    sb.Append(c);
            return System.Text.RegularExpressions.Regex.Replace(
                sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant(),
                @"[^a-z0-9]+", "-").Trim('-');
        }
        return $"{Slugify(deviceType)}-{Slugify(ownerName)}";
    }
}

