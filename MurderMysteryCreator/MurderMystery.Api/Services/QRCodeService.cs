using QRCoder;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Drawing;
using System.Drawing.Imaging;
using DrawingSize = System.Drawing.Size;
using DrawingImageFormat = System.Drawing.Imaging.ImageFormat;

namespace MurderMystery.Api.Services;

public interface IQRCodeService
{
    byte[] GenerateQRCodeImage(string url, int size = 300);
    byte[] GenerateQRCodePDF(string url, string deviceType, string ownerName, string frontendBaseUrl);
}

public class QRCodeService : IQRCodeService
{
    public byte[] GenerateQRCodeImage(string url, int size = 300)
    {
        try
        {
            using var qrGenerator = new QRCodeGenerator();
            var qrCodeData = qrGenerator.CreateQrCode(url, QRCodeGenerator.ECCLevel.Q);
            
            // Use PngByteQRCode which doesn't require System.Drawing for basic operations
            using var pngQrCode = new PngByteQRCode(qrCodeData);
            var qrCodeBytes = pngQrCode.GetGraphic(20);
            
            // If we need to resize, we'll use System.Drawing
            if (size != 300)
            {
                using var ms = new MemoryStream(qrCodeBytes);
                using var originalBitmap = new Bitmap(ms);
                using var resizedBitmap = new Bitmap(originalBitmap, new DrawingSize(size, size));
                using var outputMs = new MemoryStream();
                resizedBitmap.Save(outputMs, DrawingImageFormat.Png);
                return outputMs.ToArray();
            }
            
            return qrCodeBytes;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Error generating QR code: {ex.Message}", ex);
        }
    }

    public byte[] GenerateQRCodePDF(string url, string deviceType, string ownerName, string frontendBaseUrl)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        
        var qrCodeBytes = GenerateQRCodeImage(url, 200);
        var qrCodeBase64 = Convert.ToBase64String(qrCodeBytes);

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(x => x.FontSize(14));

                page.Header()
                    .AlignCenter()
                    .Text($"Device QR Code")
                    .FontSize(20)
                    .Bold();

                page.Content()
                    .Column(column =>
                    {
                        column.Spacing(1, Unit.Centimetre);

                        // Device Info
                        column.Item()
                            .Padding(1, Unit.Centimetre)
                            .Background(Colors.Grey.Lighten3)
                            .Column(infoColumn =>
                            {
                                infoColumn.Item().Text($"Device Type: {deviceType}").Bold();
                                infoColumn.Item().Text($"Owner: {ownerName}").Bold();
                            });

                        // QR Code Image
                        column.Item()
                            .AlignCenter()
                            .Image(Convert.FromBase64String(qrCodeBase64))
                            .FitWidth();

                        // URL Text
                        column.Item()
                            .AlignCenter()
                            .Text($"Scan to access device simulator")
                            .FontSize(12)
                            .Italic();

                        column.Item()
                            .AlignCenter()
                            .Text(url)
                            .FontSize(10)
                            .FontColor(Colors.Blue.Darken1);
                    });

                page.Footer()
                    .AlignCenter()
                    .DefaultTextStyle(style => style.FontSize(10).FontColor(Colors.Grey.Medium))
                    .Text(x =>
                    {
                        x.Span("Generated on ");
                        x.Span(DateTime.Now.ToString("yyyy-MM-dd HH:mm")).Bold();
                    });
            });
        })
        .GeneratePdf();

        return pdfBytes;
    }
}
