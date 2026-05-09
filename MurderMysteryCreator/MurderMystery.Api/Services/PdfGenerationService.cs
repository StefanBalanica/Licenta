using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MurderMystery.Api.Services;

/// <summary>
/// Service for generating PDF documents for physical evidence
/// </summary>
public class PdfGenerationService
{
    // Fills a field value followed by dots up to totalWidth chars
    private static string DotField(string? value, int totalWidth)
    {
        var v = (value ?? "").Trim();
        if (v.Length >= totalWidth) return v;
        return v + new string('.', totalWidth - v.Length);
    }

    private static string ValueOrFallback(string? value, string fallback)
        => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static bool IsSuspectRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return true;
        var r = role.Trim().ToLowerInvariant();
        if (r.Contains("martor") || r.Contains("witness")) return false;
        return true;
    }

    public byte[] GenerateCharacterProfilePdf(
        string fullName,
        string occupation,
        string relationToVictim,
        string alibi,
        string motive,
        string description,
        string backstory,
        string role,
        byte[]? profileImage)
    {
        var caseRef   = $"SP-{DateTime.UtcNow:yyyy}-{Math.Abs(fullName.GetHashCode()) % 1000:D3}";
        var today     = DateTime.UtcNow;
        var isSuspect = IsSuspectRole(role);

        var phone = System.Text.RegularExpressions.Regex.Match(
            description ?? "",
            @"(?:telefon|phone|tel)[\:\s]+([0-9][0-9\-\s]{5,14})",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        ).Groups[1].Value.Trim();

        var occMatch = System.Text.RegularExpressions.Regex.Match(
            description ?? "", @"Ocupa[t\u0163]ie[\:\s]+([^\|]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var cleanOccupation = occMatch.Success
            ? occMatch.Groups[1].Value.Trim()
            : ValueOrFallback(occupation, "");

        var relMatch = System.Text.RegularExpressions.Regex.Match(
            description ?? "", @"Rela[t\u0163]ie[\:\s]+([^\|]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        var cleanRelation = relMatch.Success
            ? relMatch.Groups[1].Value.Trim()
            : ValueOrFallback(relationToVictim, "");

        var storyText  = ValueOrFallback(backstory, ValueOrFallback(description, ""));
        var alibiText  = ValueOrFallback(alibi, "");
        var motiveText = ValueOrFallback(motive, "");

        var nameParts = fullName.Trim().Split(' ', 2);
        var firstName = nameParts.Length > 0 ? nameParts[0] : fullName;
        var lastName  = nameParts.Length > 1 ? nameParts[1] : "";

        // Build full statement text
        var statement = storyText;
        if (!string.IsNullOrWhiteSpace(alibiText))
            statement += $"\n\nAlibi declarat: {alibiText}";
        if (!string.IsNullOrWhiteSpace(motiveText))
            statement += $"\n\nMobil posibil: {motiveText}";

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(35);
                page.PageColor("#ffffff");
                page.DefaultTextStyle(x => x
                    .FontSize(9.5f)
                    .FontFamily("Courier New")
                    .FontColor("#111111"));

                page.Content().Column(main =>
                {
                    main.Spacing(0);

                    // File number
                    main.Item().Text($"Nr. Dosar : {caseRef}").FontSize(8.5f);
                    main.Item().PaddingTop(8);

                    // Title
                    main.Item().Text("PROFIL SUSPECT").FontSize(22f).Bold();
                    main.Item().PaddingTop(4).LineHorizontal(1.5f).LineColor("#111");
                    main.Item().PaddingTop(12);

                    // ── TOP BOX: Fields left + Photo right ──────────────────
                    main.Item().Border(1).BorderColor("#555").Row(topRow =>
                    {
                        // Form fields
                        topRow.RelativeItem().Padding(10).Column(fields =>
                        {
                            fields.Spacing(9);

                            fields.Item().Text(t =>
                            {
                                t.Span("Prenume ").Bold();
                                t.Span(DotField(firstName, 17));
                                t.Span("  Nume de familie ").Bold();
                                t.Span(DotField(lastName, 14));
                            });

                            fields.Item().Text(t =>
                            {
                                t.Span("Gen ").Bold();
                                t.Span(DotField("", 10));
                                t.Span("  Adresa ").Bold();
                                t.Span(DotField("", 22));
                            });

                            fields.Item().Text(t =>
                            {
                                t.Span("Ocupatie ").Bold();
                                t.Span(DotField(cleanOccupation, 18));
                                t.Span("  Rol ").Bold();
                                t.Span(DotField(isSuspect ? "Suspect" : "Martor", 10));
                            });

                            fields.Item().Text(t =>
                            {
                                t.Span("Relatie cu victima ").Bold();
                                t.Span(DotField(cleanRelation, 36));
                            });

                            fields.Item().Text(t =>
                            {
                                t.Span("Telefon ").Bold();
                                t.Span(DotField(phone, 16));
                                t.Span("  Data nasterii ").Bold();
                                t.Span(DotField("", 12));
                            });

                            fields.Item().Text(t =>
                            {
                                t.Span("Locul nasterii ").Bold();
                                t.Span(DotField("", 18));
                                t.Span("  Gen ").Bold();
                                t.Span(DotField("", 10));
                            });
                        });

                        // Photo box
                        topRow.ConstantItem(1).Background("#555");
                        topRow.ConstantItem(115).Column(photoCol =>
                        {
                            photoCol.Item().Height(165)
                                .Element(el =>
                                {
                                    if (profileImage is { Length: > 0 })
                                        el.Image(profileImage).FitArea();
                                    else
                                        el.Background("#e8e8e8")
                                            .AlignCenter().AlignMiddle()
                                            .Column(c =>
                                            {
                                                c.Item().AlignCenter()
                                                    .Text("FOTOGRAFIE")
                                                    .FontSize(8f).FontColor("#888").Italic();
                                            });
                                });
                        });
                    });

                    main.Item().PaddingTop(12);

                    // ── INDIVIDUAL STATEMENT BOX ─────────────────────────────
                    main.Item().Border(1).BorderColor("#555").Padding(10).Column(stmt =>
                    {
                        stmt.Item().Text("Declaratie Individuala").FontSize(12f).Bold();
                        stmt.Item().PaddingTop(2)
                            .Text("(Descrieti pe scurt relatia cu victima si locul in care va aflati in momentul incidentului)")
                            .FontSize(7.5f).Italic().FontColor("#555");
                        stmt.Item().PaddingTop(8);

                        if (!string.IsNullOrWhiteSpace(statement))
                        {
                            stmt.Item().Text(statement.Trim())
                                .FontSize(9.5f).LineHeight(1.8f);
                        }
                        else
                        {
                            for (int i = 0; i < 9; i++)
                                stmt.Item().PaddingTop(i % 2 == 0 ? 0 : 2)
                                    .Background(i % 2 == 0 ? "#ffffff" : "#f2f2f2")
                                    .PaddingVertical(4)
                                    .Text(new string('.', 78))
                                    .FontSize(9f).FontColor("#ccc");
                        }
                    });

                    main.Item().PaddingTop(12);

                    // ── BOTTOM TABLE ─────────────────────────────────────────
                    main.Item().Border(1).BorderColor("#555").Row(botRow =>
                    {
                        // Left: label+value rows
                        botRow.RelativeItem(3).Column(left =>
                        {
                            // Row 1: Data
                            left.Item().BorderBottom(1).BorderColor("#555").Row(r =>
                            {
                                r.ConstantItem(110).BorderRight(1).BorderColor("#555")
                                    .Padding(5).Text("Data inregistrarii").FontSize(8.5f).Bold();
                                r.RelativeItem().Padding(5)
                                    .Text(today.ToString("dd.MM.yyyy")).FontSize(9.5f);
                            });
                            // Row 2: Telefon
                            left.Item().BorderBottom(1).BorderColor("#555").Row(r =>
                            {
                                r.ConstantItem(110).BorderRight(1).BorderColor("#555")
                                    .Padding(5).Text("Numar telefon").FontSize(8.5f).Bold();
                                r.RelativeItem().Padding(5)
                                    .Text(string.IsNullOrEmpty(phone) ? "" : phone)
                                    .FontSize(9.5f);
                            });
                            // Row 3: Email
                            left.Item().Row(r =>
                            {
                                r.ConstantItem(110).BorderRight(1).BorderColor("#555")
                                    .Padding(5).Text("Adresa email").FontSize(8.5f).Bold();
                                r.RelativeItem().Padding(5).Text("").FontSize(9.5f);
                            });
                        });

                        // Right: signature
                        botRow.ConstantItem(1).Background("#555");
                        botRow.RelativeItem(2).Padding(8).Column(sig =>
                        {
                            sig.Item().Text("Semnatura suspect").FontSize(8.5f).Bold();
                            sig.Item().Height(50);
                            sig.Item().LineHorizontal(1).LineColor("#555");
                        });
                    });
                });
            });
        }).GeneratePdf();
    }

    /// <summary>Generate a newspaper-style PDF</summary>
    public byte[] GenerateNewspaperPdf(string headline, string date, string content, string authorName)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.Georgia));

                page.Header().BorderBottom(1).Padding(10).Row(row =>
                {
                    row.RelativeItem().Column(column =>
                    {
                        column.Item().Text("THE MYSTERY GAZETTE").FontSize(24).Bold();
                        column.Item().Text(date).FontSize(10).Italic();
                    });
                });

                page.Content().PaddingVertical(20).Column(column =>
                {
                    column.Spacing(10);
                    column.Item().Text(headline).FontSize(20).Bold().FontColor(Colors.Black);
                    column.Item().Text($"By {authorName}").FontSize(10).Italic().FontColor(Colors.Grey.Darken2);
                    column.Item().PaddingTop(10).Text(content).FontSize(11).LineHeight(1.5f);
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });
        }).GeneratePdf();
    }

    /// <summary>Generate a police report PDF</summary>
    public byte[] GeneratePoliceReportPdf(string caseNumber, string date, string officer, string incidentType, string details)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.Calibri));

                page.Header().BorderBottom(2).Background(Colors.Grey.Lighten3).Padding(15).Column(column =>
                {
                    column.Item().Text("RAPORT OFICIAL POLITIE").FontSize(18).Bold();
                    column.Item().Text("CONFIDENTIAL").FontSize(10).Italic().FontColor(Colors.Red.Medium);
                });

                page.Content().PaddingVertical(20).Column(column =>
                {
                    column.Spacing(15);
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Nr. dosar: {caseNumber}").Bold();
                        row.RelativeItem().Text($"Data: {date}").AlignRight();
                    });
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Text($"Ofiter: {officer}");
                        row.RelativeItem().Text($"Tip incident: {incidentType}").AlignRight();
                    });
                    column.Item().LineHorizontal(1);
                    column.Item().Text("DETALII INCIDENT").FontSize(14).Bold().Underline();
                    column.Item().Text(details).FontSize(11).LineHeight(1.5f);
                });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Pagina ");
                    text.CurrentPageNumber();
                });
            });
        }).GeneratePdf();
    }

    /// <summary>Generate a generic document PDF</summary>
    public byte[] GenerateDocumentPdf(string title, string content)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(12));

                page.Content().PaddingVertical(20).Column(column =>
                {
                    column.Spacing(15);
                    column.Item().Text(title).FontSize(18).Bold();
                    column.Item().Text(content).FontSize(12).LineHeight(1.5f);
                });
            });
        }).GeneratePdf();
    }

    /// <summary>Generate a QR code page with device instructions</summary>
    public byte[] GenerateQRCodePdf(byte[] qrCodeImage, string deviceName, string deviceType, string url)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);

                page.Content().PaddingVertical(20).Column(column =>
                {
                    column.Spacing(20);
                    column.Item().AlignCenter().Text($"{deviceName}'s {deviceType}").FontSize(20).Bold();
                    column.Item().AlignCenter().Text("Scan to Access Digital Evidence").FontSize(14);
                    column.Item().AlignCenter().Image(qrCodeImage).FitWidth();
                    column.Item().AlignCenter().Text(url).FontSize(10).Italic().FontColor(Colors.Grey.Medium);
                    column.Item().PaddingTop(20).Text("Instructions:").FontSize(12).Bold();
                    column.Item().Text("1. Open your phone's camera app").FontSize(11);
                    column.Item().Text("2. Point at the QR code above").FontSize(11);
                    column.Item().Text("3. Tap the notification to open the device simulator").FontSize(11);
                });
            });
        }).GeneratePdf();
    }
}
