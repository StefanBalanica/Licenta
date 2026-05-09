using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MurderMystery.Api.Services;

/// <summary>
/// Service for generating PDF documents for physical evidence
/// </summary>
public class PdfGenerationService
{
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
        var caseRef = $"SP-{DateTime.UtcNow:yyyy}-{Math.Abs(fullName.GetHashCode()) % 1000:D3}";
        var today = DateTime.UtcNow;
        var isSuspect = IsSuspectRole(role);

        // Parse phone from description (e.g. "| Numar telefon: 0733-109-882")
        var phone = System.Text.RegularExpressions.Regex.Match(
            description ?? "",
            @"(?:telefon|phone|tel)[:\s]+([0-9][0-9\-\s]{5,14})",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        ).Groups[1].Value.Trim();

        // Better occupation: extract after "Ocupatie:" pipe segment
        var occMatch = System.Text.RegularExpressions.Regex.Match(
            description ?? "",
            @"Ocupa[t\u0163]ie[:\s]+([^|]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );
        var cleanOccupation = occMatch.Success
            ? occMatch.Groups[1].Value.Trim()
            : ValueOrFallback(occupation, "-");

        // Better relation: extract after "Relatie:" pipe segment
        var relMatch = System.Text.RegularExpressions.Regex.Match(
            description ?? "",
            @"Rela[t\u0163]ie[:\s]+([^|]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase
        );
        var cleanRelation = relMatch.Success
            ? relMatch.Groups[1].Value.Trim()
            : ValueOrFallback(relationToVictim, "-");

        var storyText  = ValueOrFallback(backstory, ValueOrFallback(description, string.Empty));
        var alibiText  = ValueOrFallback(alibi, string.Empty);
        var motiveText = ValueOrFallback(motive, string.Empty);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(0);
                page.PageColor("#ffffff");
                page.DefaultTextStyle(x => x.FontSize(10.5f).FontFamily(Fonts.Calibri).FontColor("#1c1c1c"));

                page.Content().Column(main =>
                {
                    main.Spacing(0);

                    // ── HEADER ────────────────────────────────────────────────────
                    main.Item().Background("#1a2744").Padding(18).Row(row =>
                    {
                        row.RelativeItem().Column(left =>
                        {
                            left.Item().Text("MINISTERUL AFACERILOR INTERNE")
                                .FontSize(7.5f).FontColor("#7a9ccf").LetterSpacing(1.2f);
                            left.Item().PaddingTop(3).Text("INSPECTORATUL DE POLITIE CRIMINALA")
                                .FontSize(15f).Bold().FontColor("#ffffff");
                            left.Item().PaddingTop(2).Text("DIRECTIA DE INVESTIGATII — DOSAR PENAL")
                                .FontSize(7.5f).FontColor("#7a9ccf").LetterSpacing(0.5f);
                        });

                        row.ConstantItem(190).Column(right =>
                        {
                            right.Item().AlignRight().Background("#9b1a1a")
                                .PaddingHorizontal(12).PaddingVertical(5)
                                .Text("CONFIDENTIAL").FontSize(8.5f).Bold()
                                .FontColor("#ffffff").LetterSpacing(2f);
                            right.Item().PaddingTop(8).AlignRight()
                                .Text("FISA DE IDENTIFICARE PERSOANA")
                                .FontSize(7.5f).FontColor("#7a9ccf").LetterSpacing(0.4f);
                            right.Item().AlignRight().Text($"Nr. dosar: {caseRef}")
                                .FontSize(9f).FontColor("#ccd8ee");
                            right.Item().AlignRight().Text($"Data: {today:dd.MM.yyyy}")
                                .FontSize(9f).FontColor("#ccd8ee");
                            right.Item().PaddingTop(6).AlignRight()
                                .Text(isSuspect ? "STATUS: SUSPECT" : "STATUS: MARTOR")
                                .FontSize(8.5f).Bold()
                                .FontColor(isSuspect ? "#ffb347" : "#6ee06e").LetterSpacing(0.6f);
                        });
                    });

                    // Gold accent line
                    main.Item().Height(4).Background("#c9a227");

                    // ── BODY ──────────────────────────────────────────────────────
                    main.Item().Padding(26).Column(body =>
                    {
                        body.Spacing(16);

                        // Name + photo row
                        body.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Item().Text("DATE PERSONALE")
                                    .FontSize(7.5f).FontColor("#888").LetterSpacing(1.2f);
                                left.Item().PaddingTop(4)
                                    .Text(fullName.ToUpperInvariant())
                                    .FontSize(30f).Bold().FontColor("#1a2744");
                                left.Item().PaddingTop(6).Width(56).LineHorizontal(3).LineColor("#c9a227");
                                left.Item().PaddingTop(14)
                                    .Border(1)
                                    .BorderColor(isSuspect ? "#9b1a1a" : "#1a6e1a")
                                    .Background(isSuspect ? "#fff5f5" : "#f5fff5")
                                    .PaddingHorizontal(14).PaddingVertical(5)
                                    .Text(isSuspect ? "SUSPECT" : "MARTOR")
                                    .FontSize(9.5f).Bold()
                                    .FontColor(isSuspect ? "#9b1a1a" : "#1a6e1a").LetterSpacing(1.5f);
                            });

                            // Photo box
                            row.ConstantItem(144).Height(170)
                                .Border(2).BorderColor("#1a2744")
                                .AlignCenter().AlignMiddle()
                                .Element(el =>
                                {
                                    if (profileImage is { Length: > 0 })
                                        el.Image(profileImage).FitArea();
                                    else
                                        el.Background("#e6e2dc").Column(c =>
                                        {
                                            c.Item().PaddingTop(55).AlignCenter()
                                                .Text("FOTOGRAFIE LIPSA")
                                                .FontSize(8).FontColor("#999").Italic();
                                        });
                                });
                        });

                        // Divider
                        body.Item().LineHorizontal(1).LineColor("#d8d8d8");

                        // Info grid — 3 columns
                        body.Item().Border(1).BorderColor("#d0d0d0").Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Background("#1a2744").PaddingHorizontal(10).PaddingVertical(6)
                                    .Text("RELATIE CU CAZUL")
                                    .FontSize(7.5f).Bold().FontColor("#7a9ccf").LetterSpacing(0.8f);
                                c.Item().Padding(10)
                                    .Text(string.IsNullOrWhiteSpace(cleanRelation) ? "-" : cleanRelation)
                                    .FontSize(10.5f).LineHeight(1.4f);
                            });
                            row.ConstantItem(1).Background("#d0d0d0");
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Background("#1a2744").PaddingHorizontal(10).PaddingVertical(6)
                                    .Text("OCUPATIE")
                                    .FontSize(7.5f).Bold().FontColor("#7a9ccf").LetterSpacing(0.8f);
                                c.Item().Padding(10)
                                    .Text(string.IsNullOrWhiteSpace(cleanOccupation) ? "-" : cleanOccupation)
                                    .FontSize(10.5f).LineHeight(1.4f);
                            });
                            row.ConstantItem(1).Background("#d0d0d0");
                            row.ConstantItem(130).Column(c =>
                            {
                                c.Item().Background("#1a2744").PaddingHorizontal(10).PaddingVertical(6)
                                    .Text("TELEFON")
                                    .FontSize(7.5f).Bold().FontColor("#7a9ccf").LetterSpacing(0.8f);
                                c.Item().Padding(10)
                                    .Text(string.IsNullOrEmpty(phone) ? "-" : phone)
                                    .FontSize(10.5f);
                            });
                        });

                        // BACKGROUND / POVESTE
                        if (!string.IsNullOrWhiteSpace(storyText))
                        {
                            body.Item().Column(sec =>
                            {
                                sec.Item().Row(r =>
                                {
                                    r.ConstantItem(4).Background("#1a2744");
                                    r.RelativeItem().PaddingLeft(10)
                                        .Text("BACKGROUND — SITUATIE SI CONTEXT")
                                        .FontSize(8f).Bold().FontColor("#1a2744").LetterSpacing(0.8f);
                                });
                                sec.Item().PaddingTop(8).PaddingLeft(14)
                                    .Text(storyText.Trim())
                                    .FontSize(10.5f).LineHeight(1.55f);
                            });
                        }

                        // ALIBI
                        if (!string.IsNullOrWhiteSpace(alibiText))
                        {
                            body.Item().Column(sec =>
                            {
                                sec.Item().Row(r =>
                                {
                                    r.ConstantItem(4).Background("#c9a227");
                                    r.RelativeItem().PaddingLeft(10)
                                        .Text("ALIBI DECLARAT")
                                        .FontSize(8f).Bold().FontColor("#1a2744").LetterSpacing(0.8f);
                                });
                                sec.Item().PaddingTop(8).PaddingLeft(14)
                                    .Text(alibiText.Trim())
                                    .FontSize(10.5f).LineHeight(1.55f);
                            });
                        }

                        // MOBIL
                        if (!string.IsNullOrWhiteSpace(motiveText))
                        {
                            body.Item().Column(sec =>
                            {
                                sec.Item().Row(r =>
                                {
                                    r.ConstantItem(4).Background("#9b1a1a");
                                    r.RelativeItem().PaddingLeft(10)
                                        .Text("MOBIL POSIBIL / OBSERVATII ANCHETA")
                                        .FontSize(8f).Bold().FontColor("#1a2744").LetterSpacing(0.8f);
                                });
                                sec.Item().PaddingTop(8).PaddingLeft(14)
                                    .Border(1).BorderColor("#e8cccc").Background("#fff8f8").Padding(12)
                                    .Text(motiveText.Trim())
                                    .FontSize(10.3f).Italic().FontColor("#5a2020").LineHeight(1.45f);
                            });
                        }

                        // ── SIGNATURE BLOCK ──────────────────────────────────────
                        body.Item().PaddingTop(16).LineHorizontal(1).LineColor("#c9a227");
                        body.Item().PaddingTop(12).Row(row =>
                        {
                            row.RelativeItem().PaddingHorizontal(8).Column(c =>
                            {
                                c.Item().Text("SEMNATURA PERSOANA AUDIATA")
                                    .FontSize(7.5f).FontColor("#888").LetterSpacing(0.5f);
                                c.Item().PaddingTop(36).LineHorizontal(1).LineColor("#1a2744");
                                c.Item().PaddingTop(4).Text(fullName)
                                    .FontSize(8.5f).FontColor("#555");
                            });
                            row.ConstantItem(110).PaddingHorizontal(8).Column(c =>
                            {
                                c.Item().Text("DATA")
                                    .FontSize(7.5f).FontColor("#888").LetterSpacing(0.5f);
                                c.Item().PaddingTop(36).LineHorizontal(1).LineColor("#1a2744");
                                c.Item().PaddingTop(4).Text(today.ToString("dd.MM.yyyy"))
                                    .FontSize(8.5f).FontColor("#555");
                            });
                            row.RelativeItem().PaddingHorizontal(8).Column(c =>
                            {
                                c.Item().Text("SEMNATURA OFITER ANCHETA")
                                    .FontSize(7.5f).FontColor("#888").LetterSpacing(0.5f);
                                c.Item().PaddingTop(36).LineHorizontal(1).LineColor("#1a2744");
                                c.Item().PaddingTop(4).Text("L.S.")
                                    .FontSize(8.5f).FontColor("#555");
                            });
                        });

                        // Footer
                        body.Item().PaddingTop(12).AlignRight()
                            .Text($"Document oficial · Nr. {caseRef} · Generat: {today:dd.MM.yyyy HH:mm}")
                            .FontSize(7.5f).FontColor("#bbb").Italic();
                    });
                });
            });
        }).GeneratePdf();
    }

    private static string ValueOrFallback(string? value, string fallback)
        => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static bool IsSuspectRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return true;
        var r = role.Trim().ToLowerInvariant();
        if (r.Contains("martor") || r.Contains("witness")) return false;
        if (r.Contains("suspect")) return true;
        return true;
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

                page.Header()
                    .BorderBottom(1)
                    .Padding(10)
                    .Row(row =>
                    {
                        row.RelativeItem().Column(column =>
                        {
                            column.Item().Text("THE MYSTERY GAZETTE").FontSize(24).Bold();
                            column.Item().Text(date).FontSize(10).Italic();
                        });
                    });

                page.Content()
                    .PaddingVertical(20)
                    .Column(column =>
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

                page.Header()
                    .BorderBottom(2)
                    .Background(Colors.Grey.Lighten3)
                    .Padding(15)
                    .Column(column =>
                    {
                        column.Item().Text("OFFICIAL POLICE REPORT").FontSize(18).Bold();
                        column.Item().Text("CONFIDENTIAL").FontSize(10).Italic().FontColor(Colors.Red.Medium);
                    });

                page.Content()
                    .PaddingVertical(20)
                    .Column(column =>
                    {
                        column.Spacing(15);
                        column.Item().Row(row =>
                        {
                            row.RelativeItem().Text($"Case Number: {caseNumber}").Bold();
                            row.RelativeItem().Text($"Date: {date}").AlignRight();
                        });
                        column.Item().Row(row =>
                        {
                            row.RelativeItem().Text($"Reporting Officer: {officer}");
                            row.RelativeItem().Text($"Incident Type: {incidentType}").AlignRight();
                        });
                        column.Item().LineHorizontal(1);
                        column.Item().Text("INCIDENT DETAILS").FontSize(14).Bold().Underline();
                        column.Item().Text(details).FontSize(11).LineHeight(1.5f);
                    });

                page.Footer().AlignCenter().Text(text =>
                {
                    text.Span("Page ");
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

                page.Content()
                    .PaddingVertical(20)
                    .Column(column =>
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

                page.Content()
                    .PaddingVertical(20)
                    .Column(column =>
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
