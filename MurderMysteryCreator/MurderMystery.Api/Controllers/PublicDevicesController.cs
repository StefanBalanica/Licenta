using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Models;
using MurderMystery.Api.Repositories;

namespace MurderMystery.Api.Controllers;

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
            var camelOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

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
                    try
                    {
                        var raw = a.AppData.RootElement.GetRawText();
                        var node = JsonNode.Parse(raw);
                        var camelJson = JsonSerializer.Serialize(node, camelOptions);
                        appData = JsonSerializer.Deserialize<object>(camelJson) ?? appData;
                    }
                    catch { /* keep empty */ }
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
}
