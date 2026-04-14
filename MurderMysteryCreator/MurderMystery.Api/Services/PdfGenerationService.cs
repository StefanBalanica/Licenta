using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MurderMystery.Api.Services;

/// <summary>
/// Service for generating PDF documents for physical evidence
/// </summary>
public class PdfGenerationService
{
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
