using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Models;
using TheInvestigation.Api.Repositories;

namespace TheInvestigation.Api.Controllers;

/// <summary>
/// Public (no-auth) endpoint used by QR-code device pages.
/// URL format: GET /api/devices/public/{slug}  e.g. /api/devices/public/iphone-elodia
/// </summary>
[ApiController]
[Route("api/devices/public")]
[AllowAnonymous]
public class PublicDevicesController : ControllerBase
{
    private readonly IRepository<DigitalDevice> _deviceRepository;
    private readonly IRepository<DeviceApp> _appRepository;
    private readonly ILogger<PublicDevicesController> _logger;

    public PublicDevicesController(
        IRepository<DigitalDevice> deviceRepository,
        IRepository<DeviceApp> appRepository,
        ILogger<PublicDevicesController> logger)
    {
        _deviceRepository = deviceRepository;
        _appRepository = appRepository;
        _logger = logger;
    }

    /// <summary>
    /// Returns full device data (including apps) by slug, without authentication.
    /// Slug format: "{deviceType}-{ownerName}" e.g. "iphone-elodia"
    /// If multiple devices match (same type+owner across different games), the most recently created one is returned.
    /// </summary>
    [HttpGet("{slug}")]
    public async Task<ActionResult<DeviceWithAppsDto>> GetBySlug(string slug)
    {
        try
        {
            var parsed = ParseSlug(slug);
            if (parsed == null)
                return BadRequest(new { message = "Invalid device slug format. Expected: {deviceType}-{ownerName}" });

            var (deviceType, ownerName) = parsed.Value;

            var allDevices = await _deviceRepository.FindAsync(_ => true);
            var matched = allDevices
                .Where(d =>
                    NormalizeForComparison(d.DeviceType) == NormalizeForComparison(deviceType) &&
                    NormalizeForComparison(d.OwnerName) == NormalizeForComparison(ownerName))
                .OrderByDescending(d => d.CreatedAt)
                .FirstOrDefault();

            if (matched == null)
                return NotFound(new { message = $"Device '{slug}' not found." });

            var apps = await _appRepository.FindAsync(a => a.DeviceId == matched.DeviceId);
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

            var result = new DeviceWithAppsDto
            {
                DeviceId = matched.DeviceId,
                GameId = matched.GameId,
                DeviceType = matched.DeviceType,
                OwnerName = matched.OwnerName,
                UniqueUrl = matched.UniqueUrl,
                QRCodeUrl = matched.QRCodeUrl,
                Passcode = matched.Passcode,
                CreatedAt = matched.CreatedAt,
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

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving public device by slug '{Slug}'", slug);
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    /// <summary>
    /// Returns full device data by UniqueUrl (GUID) — guaranteed unique across all games.
    /// Used by new QR code URLs: /d/{uniqueUrl}
    /// </summary>
    [HttpGet("by-unique/{uniqueUrl}")]
    public async Task<ActionResult<DeviceWithAppsDto>> GetByUniqueUrl(string uniqueUrl)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(uniqueUrl))
                return BadRequest(new { message = "UniqueUrl is required." });

            var allDevices = await _deviceRepository.FindAsync(_ => true);
            var matched = allDevices
                .FirstOrDefault(d => string.Equals(d.UniqueUrl, uniqueUrl, StringComparison.OrdinalIgnoreCase));

            if (matched == null)
                return NotFound(new { message = $"Device with id '{uniqueUrl}' not found." });

            var apps = await _appRepository.FindAsync(a => a.DeviceId == matched.DeviceId);
            static JsonNode? CamelizeNode2(JsonNode? node)
            {
                if (node == null) return null;
                if (node is JsonArray arr)
                {
                    var outArr = new JsonArray();
                    foreach (var item in arr)
                        outArr.Add(CamelizeNode2(item));
                    return outArr;
                }
                if (node is JsonObject obj)
                {
                    var outObj = new JsonObject();
                    foreach (var kv in obj)
                    {
                        var key = kv.Key ?? "";
                        var camelKey = JsonNamingPolicy.CamelCase.ConvertName(key);
                        outObj[camelKey] = CamelizeNode2(kv.Value);
                    }
                    return outObj;
                }
                return node;
            }

            var result = new DeviceWithAppsDto
            {
                DeviceId = matched.DeviceId,
                GameId = matched.GameId,
                DeviceType = matched.DeviceType,
                OwnerName = matched.OwnerName,
                UniqueUrl = matched.UniqueUrl,
                QRCodeUrl = matched.QRCodeUrl,
                Passcode = matched.Passcode,
                CreatedAt = matched.CreatedAt,
                Apps = apps.Select(a =>
                {
                    object appData = new { };
                    var raw = a.AppData.RootElement.GetRawText();
                    try
                    {
                        var node = JsonNode.Parse(raw);
                        var camel = CamelizeNode2(node);
                        appData = JsonSerializer.Deserialize<object>(camel?.ToJsonString() ?? raw) ?? appData;
                    }
                    catch
                    {
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

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving public device by uniqueUrl '{UniqueUrl}'", uniqueUrl);
            return StatusCode(500, new { message = "An error occurred" });
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static readonly Dictionary<string, string> DeviceTypeMap = new(StringComparer.OrdinalIgnoreCase)
    {
        ["iphone"]  = "iPhone",
        ["android"] = "Android",
        ["laptop"]  = "Laptop"
    };

    /// <summary>Parses "iphone-elodia" → ("iPhone", "Elodia")</summary>
    private static (string deviceType, string ownerName)? ParseSlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug)) return null;
        var parts = slug.Split('-');
        if (parts.Length < 2) return null;

        var typeKey = parts[0].ToLowerInvariant();
        if (!DeviceTypeMap.TryGetValue(typeKey, out var deviceType)) return null;

        // Rest of parts = owner name words, Title-cased
        var ownerName = string.Join(" ", parts.Skip(1)
            .Select(p => p.Length > 0
                ? char.ToUpperInvariant(p[0]) + p.Substring(1).ToLowerInvariant()
                : p));

        return (deviceType, ownerName);
    }

    /// <summary>Removes diacritics and uppercases for comparison</summary>
    private static string NormalizeForComparison(string? s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        var normalized = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (char c in normalized)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        return sb.ToString().Normalize(NormalizationForm.FormC).ToUpperInvariant();
    }

    /// <summary>
    /// Public endpoint used by QR codes that point to /games/{gameId}/devices/{slug}/simulator.
    /// Finds device by gameId + slug (deviceType-ownerName) without authentication.
    /// This is the canonical public access path — unique per game.
    /// </summary>
    [HttpGet("by-game/{gameId}/{slug}")]
    public async Task<ActionResult<DeviceWithAppsDto>> GetByGameAndSlug(int gameId, string slug)
    {
        try
        {
            var parsed = ParseSlug(slug);
            if (parsed == null)
                return BadRequest(new { message = "Invalid device slug format." });

            var (deviceType, ownerName) = parsed.Value;

            var devices = await _deviceRepository.FindAsync(d => d.GameId == gameId);
            var matched = devices
                .FirstOrDefault(d =>
                    NormalizeForComparison(d.DeviceType) == NormalizeForComparison(deviceType) &&
                    NormalizeForComparison(d.OwnerName)  == NormalizeForComparison(ownerName));

            if (matched == null)
                return NotFound(new { message = $"Device '{slug}' not found in game {gameId}." });

            var apps = await _appRepository.FindAsync(a => a.DeviceId == matched.DeviceId);

            static JsonNode? Camelize(JsonNode? node)
            {
                if (node == null) return null;
                if (node is JsonArray arr)
                {
                    var outArr = new JsonArray();
                    foreach (var item in arr) outArr.Add(Camelize(item));
                    return outArr;
                }
                if (node is JsonObject obj)
                {
                    var outObj = new JsonObject();
                    foreach (var kv in obj)
                    {
                        var camelKey = JsonNamingPolicy.CamelCase.ConvertName(kv.Key ?? "");
                        outObj[camelKey] = Camelize(kv.Value);
                    }
                    return outObj;
                }
                return node;
            }

            var result = new DeviceWithAppsDto
            {
                DeviceId  = matched.DeviceId,
                GameId    = matched.GameId,
                DeviceType = matched.DeviceType,
                OwnerName  = matched.OwnerName,
                UniqueUrl  = matched.UniqueUrl,
                QRCodeUrl  = matched.QRCodeUrl,
                Passcode   = matched.Passcode,
                CreatedAt  = matched.CreatedAt,
                Apps = apps.Select(a =>
                {
                    object appData = new { };
                    var raw = a.AppData.RootElement.GetRawText();
                    try
                    {
                        var node = JsonNode.Parse(raw);
                        var camel = Camelize(node);
                        appData = JsonSerializer.Deserialize<object>(camel?.ToJsonString() ?? raw) ?? appData;
                    }
                    catch
                    {
                        try { appData = JsonSerializer.Deserialize<object>(raw) ?? appData; } catch { /* keep empty */ }
                    }
                    return new DeviceAppDto
                    {
                        AppId     = a.AppId,
                        DeviceId  = a.DeviceId,
                        AppType   = a.AppType,
                        AppData   = appData,
                        CreatedAt = a.CreatedAt
                    };
                }).ToList()
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving public device for game {GameId} slug '{Slug}'", gameId, slug);
            return StatusCode(500, new { message = "An error occurred" });
        }
    }
}
