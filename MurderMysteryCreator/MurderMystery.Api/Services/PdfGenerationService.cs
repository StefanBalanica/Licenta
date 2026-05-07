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
        var caseRef = BuildCaseReference(fullName);
        var today = DateTime.UtcNow;

        var storyText = ValueOrFallback(backstory, ValueOrFallback(description, string.Empty));
        var statementText = ValueOrFallback(description, string.Empty);
        var alibiText = ValueOrFallback(alibi, string.Empty);
        var noteText = ValueOrFallback(motive, string.Empty);
        var relationText = ValueOrFallback(relationToVictim, string.Empty);
        var occupationText = ValueOrFallback(occupation, string.Empty);
        var phoneText = string.Empty;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.0f, Unit.Centimetre);
                page.PageColor("#f2f0ea"); // desk/background, not the paper itself
                page.DefaultTextStyle(x => x.FontSize(10.3f).FontFamily(Fonts.Georgia).FontColor("#111111"));

                page.Content()
                    .Padding(10)
                    .Element(paper =>
                    {
                        paper
                            .Background("#fbfaf6") // paper
                            .Border(1)
                            .BorderColor("#dedad0")
                            .Padding(18)
                            .Column(column =>
                {
                    column.Spacing(12);

                    // Top bar (like the screenshot)
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().Row(left =>
                        {
                            left.ConstantItem(28).Height(28)
                                .Border(1).BorderColor("#cfcabf")
                                .Background("#ffffff")
                                .AlignCenter().AlignMiddle()
                                .Text("D").FontSize(12).Bold().FontColor("#1a1a1a");
                            left.RelativeItem().PaddingLeft(10).Column(t =>
                            {
                                t.Item().Text("UNITATEA DE ANCHETĂ")
                                    .FontSize(8.2f).FontColor("#6f6a60").LetterSpacing(0.4f);
                                t.Item().Text("DOSAR CRIMINAL")
                                    .FontSize(14.5f).Bold().FontColor("#111111");
                                t.Item().Text("EVIDENȚA PERSOANE IMPLICATE")
                                    .FontSize(8.2f).FontColor("#6f6a60").LetterSpacing(0.35f);
                            });
                        });

                        row.ConstantItem(200).AlignRight().Column(right =>
                        {
                            right.Item().AlignRight().Text("FIȘĂ PERSOANĂ")
                                .FontSize(8.8f).FontColor("#6f6a60").LetterSpacing(0.5f);
                            right.Item().AlignRight().Text($"Dosar nr.: {caseRef}")
                                .FontSize(8.5f).FontColor("#6f6a60");
                            right.Item().AlignRight().Text($"Data: {today:dd.MM.yyyy}")
                                .FontSize(8.5f).FontColor("#6f6a60");
                        });
                    });

                    column.Item().LineHorizontal(1).LineColor("#d8d4ca");

                    // Name + photo
                    column.Item().Row(row =>
                    {
                        row.RelativeItem().PaddingTop(6).Column(left =>
                        {
                            left.Item().Text(fullName.ToUpperInvariant()).FontSize(28).Bold().FontColor("#111111");
                            left.Item().PaddingTop(6).Width(42).LineHorizontal(3).LineColor("#2a2a2a");
                        });

                        row.ConstantItem(158).AlignRight()
                            .Border(1).BorderColor("#d8d4ca")
                            .Background("#ffffff")
                            .Padding(7).Height(124)
                            .AlignCenter().AlignMiddle()
                            .Element(el =>
                        {
                            if (profileImage is { Length: > 0 })
                                el.Image(profileImage).FitArea();
                            else
                                el.Column(c =>
                                {
                                    c.Item().Text("FOTOGRAFIE").FontSize(8).FontColor("#6f6a60").LetterSpacing(3.0f);
                                    c.Item().PaddingTop(6).Height(52).Width(52).Border(1).BorderColor("#e1ddd3").AlignCenter().AlignMiddle()
                                        .Text(" ").FontSize(1);
                                });
                        });
                    });

                    // Meta row (3 columns with dividers)
                    column.Item()
                        .Border(1).BorderColor("#d8d4ca")
                        .Background("#ffffff")
                        .PaddingVertical(10)
                        .Row(row =>
                    {
                        row.RelativeItem().PaddingHorizontal(12).Column(c =>
                        {
                            c.Item().Text("RELAȚIE CU CAZUL").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.5f);
                            c.Item().PaddingTop(5).Text(string.IsNullOrWhiteSpace(relationText) ? "-" : relationText)
                                .FontSize(10.2f).SemiBold().ClampLines(3);
                        });

                        row.ConstantItem(1).Background("#e1ddd3");

                        row.RelativeItem().PaddingHorizontal(12).Column(c =>
                        {
                            c.Item().Text("OCUPAȚIE").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.6f);
                            c.Item().PaddingTop(5).Text(string.IsNullOrWhiteSpace(occupationText) ? "-" : occupationText)
                                .FontSize(10.2f).SemiBold().ClampLines(3);
                        });

                        row.ConstantItem(1).Background("#e1ddd3");

                        row.RelativeItem().PaddingHorizontal(12).Column(c =>
                        {
                            c.Item().Text("TELEFON").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.6f);
                            c.Item().PaddingTop(5).Text(string.IsNullOrWhiteSpace(phoneText) ? "-" : phoneText)
                                .FontSize(10.2f).SemiBold().ClampLines(2);
                        });
                    });

                    // POVESTE
                    column.Item().PaddingTop(2).Column(sec =>
                    {
                        sec.Item().Text("POVESTE").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.7f);
                        sec.Item().PaddingTop(6).LineHorizontal(1).LineColor("#d8d4ca");
                        sec.Item().PaddingTop(10).Text(string.IsNullOrWhiteSpace(storyText) ? "-" : storyText)
                            .FontSize(10.6f).LineHeight(1.45f).ClampLines(12);

                        if (!string.IsNullOrWhiteSpace(noteText))
                        {
                            sec.Item().PaddingTop(10).PaddingLeft(18).Text($"„{noteText.Trim()}”")
                                .Italic().FontSize(10.6f).FontColor("#55514a").ClampLines(3);
                        }
                    });

                    // DECLARAȚIE PROPRIE
                    column.Item().PaddingTop(10).Column(sec =>
                    {
                        sec.Item().Text("DECLARAȚIE PROPRIE").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.7f);
                        sec.Item().PaddingTop(6).LineHorizontal(1).LineColor("#d8d4ca");
                        sec.Item().PaddingTop(10).Border(1).BorderColor("#e1ddd3").Background("#f3f1ea").Padding(10)
                            .Text(string.IsNullOrWhiteSpace(statementText) ? "„-”" : $"„{statementText.Trim()}”")
                            .Italic().FontSize(10.3f).FontColor("#55514a").ClampLines(5);
                    });

                    // ALIBI
                    column.Item().PaddingTop(10).Column(sec =>
                    {
                        sec.Item().Text("ALIBI").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.7f);
                        sec.Item().PaddingTop(6).LineHorizontal(1).LineColor("#d8d4ca");
                        sec.Item().PaddingTop(10).Text(string.IsNullOrWhiteSpace(alibiText) ? "-" : alibiText)
                            .FontSize(10.6f).LineHeight(1.4f).ClampLines(3);

                        if (!string.IsNullOrWhiteSpace(motive))
                        {
                            sec.Item().PaddingTop(10).Border(1).BorderColor("#e1ddd3").Background("#f3f1ea").PaddingVertical(8).PaddingHorizontal(10)
                                .Row(r =>
                                {
                                    r.ConstantItem(10).AlignMiddle().Text("•").FontSize(14).FontColor("#b49b3a");
                                    r.RelativeItem().Text(noteText).FontSize(9.9f).FontColor("#55514a").ClampLines(3);
                                });
                        }
                    });

                    // Footer line + signatures
                    column.Item().PaddingTop(14).LineHorizontal(1).LineColor("#d8d4ca");
                    column.Item().PaddingTop(10).Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("SEMNĂTURĂ PERSOANĂ").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.5f);
                            c.Item().PaddingTop(18).LineHorizontal(1).LineColor("#d8d4ca");
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("DATA").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.6f);
                            c.Item().PaddingTop(18).LineHorizontal(1).LineColor("#d8d4ca");
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("SEMNĂTURĂ OFIȚER ANCHETĂ").FontSize(8).FontColor("#6f6a60").LetterSpacing(0.35f);
                            c.Item().PaddingTop(18).LineHorizontal(1).LineColor("#d8d4ca");
                        });
                    });
                });
                    });
            });
        }).GeneratePdf();
    }

    private static void RenderSection(IContainer container, string title, Action<ColumnDescriptor> content)
    {
        container.Border(1).BorderColor("#6f563a").Background("#f7efdf").Column(column =>
        {
            column.Item().Background("#f1e1bf").BorderBottom(1).BorderColor("#6f563a").PaddingVertical(4).PaddingHorizontal(8)
                .Text(title).FontSize(10.5f).Bold().FontColor("#2f2013");
            column.Item().Padding(8).Column(content);
        });
    }

    private static string ValueOrFallback(string? value, string fallback)
        => string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();

    private static string BuildCaseReference(string fullName)
    {
        var safeName = fullName ?? string.Empty;
        var initials = string.Concat(safeName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2)
            .Select(part => char.ToUpperInvariant(part[0])));
        return $"{initials}-{DateTime.UtcNow:yyyy}-{Math.Abs(safeName.GetHashCode()) % 1000:D3}";
    }

    private static (string lastName, string firstName) SplitName(string fullName)
    {
        var parts = (fullName ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return (string.Empty, string.Empty);
        if (parts.Length == 1) return (parts[0], string.Empty);
        return (parts[^1], string.Join(' ', parts[..^1]));
    }

    private static bool IsSuspectRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return true;
        var r = role.Trim().ToLowerInvariant();
        if (r.Contains("martor") || r.Contains("witness")) return false;
        if (r.Contains("suspect")) return true;
        return true;
    }

    private static void RenderFormSectionHeader(IContainer container, string title)
    {
        container
            .Border(1)
            .Background(Colors.Grey.Lighten3)
            .PaddingVertical(3)
            .PaddingHorizontal(6)
            .AlignLeft()
            .Text(title)
            .FontSize(10)
            .SemiBold();
    }

    private static void FormFieldOne(IContainer container, string label, string value)
    {
        container.Row(row =>
        {
            row.ConstantItem(110).Text(label).FontSize(10).SemiBold();
            row.RelativeItem().Text(DotsLine(value)).FontSize(10);
        });
    }

    private static void FormFieldTwo(IContainer container, string labelA, string valueA, string labelB, string valueB)
    {
        container.Row(row =>
        {
            row.ConstantItem(70).Text(labelA).FontSize(10).SemiBold();
            row.RelativeItem().Text(DotsLine(valueA)).FontSize(10);
            row.ConstantItem(86).PaddingLeft(8).Text(labelB).FontSize(10).SemiBold();
            row.RelativeItem().Text(DotsLine(valueB)).FontSize(10);
        });
    }

    private static void SexField(IContainer container, string value)
    {
        container.Row(row =>
        {
            row.ConstantItem(34).Text("SEX:").FontSize(10).SemiBold();
            row.ConstantItem(24).Element(c => CheckboxLine(c, "M", string.Equals(value, "M", StringComparison.OrdinalIgnoreCase)));
            row.ConstantItem(24).Element(c => CheckboxLine(c, "F", string.Equals(value, "F", StringComparison.OrdinalIgnoreCase)));
            row.RelativeItem().Text(DotsLine(string.Empty)).FontSize(10);
        });
    }

    private static void CheckboxLine(IContainer container, string label, bool isChecked)
    {
        container.Row(row =>
        {
            row.ConstantItem(12).Height(12).Border(1).AlignCenter().AlignMiddle().Text(isChecked ? "X" : string.Empty).FontSize(9).SemiBold();
            row.ConstantItem(6);
            row.RelativeItem().Text(label).FontSize(10).SemiBold();
        });
    }

    private static string DotsLine(string? value, int totalChars = 60)
    {
        var v = (value ?? string.Empty).Trim();
        if (v.Length >= totalChars) return v;
        var dots = new string('.', Math.Max(0, totalChars - Math.Max(0, v.Length) - 1));
        return string.IsNullOrEmpty(v) ? dots : $"{v} {dots}";
    }

    private static string ToShortSingleLine(string? value, int maxLen = 95)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var compact = string.Join(' ', value.Split(new[] { '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries)).Trim();
        return compact.Length <= maxLen ? compact : compact[..(maxLen - 1)] + "…";
    }

    /// <summary>
    /// Generate a newspaper-style PDF
    /// </summary>
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
                        
                        column.Item().Text(headline)
                            .FontSize(20)
                            .Bold()
                            .FontColor(Colors.Black);

                        column.Item().Text($"By {authorName}")
                            .FontSize(10)
                            .Italic()
                            .FontColor(Colors.Grey.Darken2);

                        column.Item().PaddingTop(10).Text(content)
                            .FontSize(11)
                            .LineHeight(1.5f)
                            .Justify();
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(text =>
                    {
                        text.Span("Page ");
                        text.CurrentPageNumber();
                        text.Span(" of ");
                        text.TotalPages();
                    });
            });
        }).GeneratePdf();
    }

    /// <summary>
    /// Generate a police report PDF
    /// </summary>
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

                        // Case Information
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

                        // Incident Details
                        column.Item().Text("INCIDENT DETAILS").FontSize(14).Bold().Underline();
                        column.Item().Text(details).FontSize(11).LineHeight(1.5f);
                    });

                page.Footer()
                    .AlignCenter()
                    .Text(text =>
                    {
                        text.Span("Page ");
                        text.CurrentPageNumber();
                    });
            });
        }).GeneratePdf();
    }

    /// <summary>
    /// Generate a generic document PDF
    /// </summary>
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
                        
                        column.Item().Text(title)
                            .FontSize(18)
                            .Bold();

                        column.Item().Text(content)
                            .FontSize(12)
                            .LineHeight(1.5f)
                            .Justify();
                    });
            });
        }).GeneratePdf();
    }

    /// <summary>
    /// Generate a QR code page with device instructions
    /// </summary>
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
                        column.Item().AlignCenter().Text($"{deviceName}'s {deviceType}")
                            .FontSize(20).Bold();

                        column.Item().AlignCenter().Text("Scan to Access Digital Evidence")
                            .FontSize(14);

                        column.Item().AlignCenter().Image(qrCodeImage).FitWidth();

                        column.Item().AlignCenter().Text(url)
                            .FontSize(10)
                            .Italic()
                            .FontColor(Colors.Grey.Medium);

                        column.Item().PaddingTop(20).Text("Instructions:")
                            .FontSize(12).Bold();

                        column.Item().Text("1. Open your phone's camera app")
                            .FontSize(11);
                        column.Item().Text("2. Point at the QR code above")
                            .FontSize(11);
                        column.Item().Text("3. Tap the notification to open the device simulator")
                            .FontSize(11);
                    });
            });
        }).GeneratePdf();
    }
}
