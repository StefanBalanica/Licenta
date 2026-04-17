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
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(1.15f, Unit.Centimetre);
                page.PageColor("#efe2c6");
                page.DefaultTextStyle(x => x.FontSize(11).FontFamily(Fonts.TimesNewRoman).FontColor("#2d2015"));

                page.Background().Padding(8).Border(1).BorderColor("#8a6d4a");

                page.Content().Column(column =>
                {
                    column.Spacing(10);

                    column.Item().Row(row =>
                    {
                        row.ConstantItem(92).Height(92).Border(2).BorderColor("#6e5639").Background("#1f3550").AlignCenter().AlignMiddle().Column(seal =>
                        {
                            seal.Item().Text("SERVICIUL").FontSize(8).FontColor(Colors.White);
                            seal.Item().Text("INVESTIGAȚII").FontSize(8).Bold().FontColor("#e9d08f");
                            seal.Item().Text("CRIMINALE").FontSize(8).Bold().FontColor("#e9d08f");
                            seal.Item().PaddingTop(4).Text("DIVIZIA").FontSize(7).FontColor(Colors.White);
                            seal.Item().Text("DOSARE").FontSize(7).FontColor(Colors.White);
                        });

                        row.RelativeItem().PaddingLeft(14).Column(head =>
                        {
                            head.Item().Text("DOSAR SUSPECT")
                                .FontSize(29).Bold().FontColor("#3a2416");
                            head.Item().Text($"FIȘĂ PROFIL - {role?.ToUpperInvariant() ?? "SUSPECT"}")
                                .FontSize(17).SemiBold().FontColor("#4b3422");
                            head.Item().PaddingTop(4).Text($"Referință: {BuildCaseReference(fullName)}")
                                .FontSize(11).Italic().FontColor("#6d543d");
                        });
                    });

                    column.Item().Row(row =>
                    {
                        row.ConstantItem(185).Column(left =>
                        {
                            left.Item().Border(3).BorderColor("#70563b").Padding(10).Background("#f7efe2").Height(230).AlignCenter().AlignMiddle().Element(el =>
                            {
                                if (profileImage is { Length: > 0 })
                                    el.Image(profileImage).FitArea();
                                else
                                    el.Text("POZĂ\nLIPSĂ").AlignCenter().FontSize(20).Bold().FontColor("#70563b");
                            });

                            left.Item().Border(1).BorderColor("#70563b").Background("#b6975f").PaddingVertical(5).PaddingHorizontal(8).AlignCenter().Text(text =>
                            {
                                text.Span("SUSPECT: ").Bold().FontColor(Colors.White);
                                text.Span(fullName.ToUpperInvariant()).Bold().FontColor(Colors.White);
                            });
                        });

                        row.RelativeItem().PaddingLeft(12).Column(right =>
                        {
                            right.Spacing(8);
                            right.Item().Element(c => RenderSection(c, "DETALII SUSPECT", details =>
                            {
                                details.Spacing(4);
                                details.Item().Text(text =>
                                {
                                    text.Span("Nume: ").Bold();
                                    text.Span(fullName);
                                });
                                details.Item().Text(text =>
                                {
                                    text.Span("Statut dosar: ").Bold();
                                    text.Span("ACTIV");
                                });
                                details.Item().Text(text =>
                                {
                                    text.Span("Ocupație: ").Bold();
                                    text.Span(ValueOrFallback(occupation, "Necunoscut"));
                                });
                                details.Item().Text(text =>
                                {
                                    text.Span("Relație cu victima: ").Bold();
                                    text.Span(ValueOrFallback(relationToVictim, "Neconfirmat în brief"));
                                });
                            }));

                            right.Item().Element(c => RenderSection(c, "REZUMAT PROFIL", summary =>
                            {
                                summary.Spacing(4);
                                summary.Item().Text(text =>
                                {
                                    text.Span("1. ALIBI: ").Bold();
                                    text.Span(string.IsNullOrWhiteSpace(alibi) ? "Neprecizat / neverificat" : alibi);
                                });
                                summary.Item().Text(text =>
                                {
                                    text.Span("Comentarii: ").Italic();
                                    text.Span("Date extrase exclusiv din brief-ul inițial.");
                                });
                            }));
                        });
                    });

                    column.Item().Element(c => RenderSection(c, "2. MOTIVUL SUSPICIUNII", body =>
                    {
                        body.Item().Text(ValueOrFallback(motive, "Nu există un motiv explicit în brief."));
                    }));

                    column.Item().Element(c => RenderSection(c, "3. DESCRIEREA CARACTERULUI", body =>
                    {
                        body.Item().Text(ValueOrFallback(description, "Nu există o descriere explicită în brief."));
                    }));

                    column.Item().Element(c => RenderSection(c, "4. DATE DE FOND & CUNOAȘTERE", body =>
                    {
                        body.Item().Text(ValueOrFallback(backstory, "Nu există informații de fundal suplimentare în brief."));
                    }));

                    column.Item().Element(c => RenderSection(c, "NOTE SUPLIMENTARE DE ANCHETĂ", body =>
                    {
                        body.Item().Text("Fișă generată automat pe baza informațiilor furnizate în brief. Conținutul trebuie verificat de către anchetator.");
                        body.Item().PaddingTop(6).Text("........................................................................................................................");
                        body.Item().Text("........................................................................................................................");
                    }));

                    column.Item().PaddingTop(8).Row(row =>
                    {
                        row.RelativeItem().Text(text =>
                        {
                            text.Span("Semnătura Inspectorului: ").Italic();
                            text.Span("____________________________");
                        });
                        row.RelativeItem().AlignRight().Text(text =>
                        {
                            text.Span("Data: ").Italic();
                            text.Span(DateTime.UtcNow.ToString("dd MMM yyyy").ToUpperInvariant());
                        });
                    });

                    column.Item().PaddingTop(8).LineHorizontal(1).LineColor("#8a6d4a");
                    column.Item().AlignCenter().Text("DOCUMENT OFICIAL INTERN | DOSAR GENERAT PENTRU JOC INVESTIGATIV")
                        .FontSize(9).SemiBold().FontColor("#5d4732");
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
        var initials = string.Concat((fullName ?? string.Empty)
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2)
            .Select(part => char.ToUpperInvariant(part[0])));
        return $"{initials}-{DateTime.UtcNow:yyyy}-{Math.Abs(fullName.GetHashCode()) % 1000:D3}";
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
