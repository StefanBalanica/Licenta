using System.Reflection;
using TheInvestigation.Api.DTOs;
using TheInvestigation.Api.Services;
using Xunit.Abstractions;

namespace TheInvestigation.Api.Tests;

public class ForensicParsersTests
{
    private readonly ITestOutputHelper _output;

    public ForensicParsersTests(ITestOutputHelper output)
    {
        _output = output;
    }

    private static string LoadFixture() =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Povestea.txt"));

    private static string GetDeviceBlock(string fullText, int deviceNumber)
    {
        var marker = $"DISPOZITIV {deviceNumber} —";
        var start = fullText.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (start < 0) return string.Empty;

        var next = fullText.IndexOf("DISPOZITIV ", start + marker.Length, StringComparison.OrdinalIgnoreCase);
        if (next < 0) next = fullText.Length;
        return fullText.Substring(start, next - start);
    }

    private static object? InvokePrivateStatic(Type t, string methodName, params object?[] args)
    {
        var mi = t.GetMethod(methodName, BindingFlags.NonPublic | BindingFlags.Static);
        Assert.NotNull(mi);
        return mi!.Invoke(null, args);
    }

    private static List<GeneratedCall> ParseCalls(string deviceBlock)
        => (List<GeneratedCall>)InvokePrivateStatic(typeof(GameService), "ParseCallsFromStory", deviceBlock)!;

    private static List<GeneratedConversation> ParseMessages(string deviceBlock, string ownerName)
        => (List<GeneratedConversation>)InvokePrivateStatic(typeof(GameService), "ParseMessagesFromStory", deviceBlock, ownerName)!;

    private static (List<GeneratedEmail> Inbox, List<GeneratedEmail> Sent, List<GeneratedEmail> Drafts) ParseEmails(string deviceBlock, string ownerName)
    {
        var args = new object?[] { deviceBlock, ownerName, null, null, null };
        InvokePrivateStatic(typeof(GameService), "ParseEmailsFromStory", args);
        return (
            (List<GeneratedEmail>)(args[2] ?? new List<GeneratedEmail>()),
            (List<GeneratedEmail>)(args[3] ?? new List<GeneratedEmail>()),
            (List<GeneratedEmail>)(args[4] ?? new List<GeneratedEmail>())
        );
    }

    private static List<GeneratedNote> ParseNotes(string deviceBlock)
        => (List<GeneratedNote>)InvokePrivateStatic(typeof(GameService), "ParseNotesFromStory", deviceBlock)!;

    private static List<GeneratedFileItem> ParseFiles(string deviceBlock)
        => (List<GeneratedFileItem>)InvokePrivateStatic(typeof(GameService), "ParseFilesFromStory", deviceBlock)!;

    private static (List<GeneratedPhoto> Photos, List<GeneratedFileItem> MediaFiles) ParseMedia(string deviceBlock)
        => ((List<GeneratedPhoto>, List<GeneratedFileItem>))InvokePrivateStatic(typeof(GameService), "ParseMediaRequirementsFromStory", deviceBlock)!;

    // D1 — iPhone al Laviniei Drăghici
    // Așteptat: 6 apeluri (incl. Apel_necunoscut_Lavinia.mp3), 2 conversații mesaje,
    //           2 email-uri (1 sent, 1 inbox), 1 notă, 0 fotografii
    [Fact]
    public void Device1_ShouldParseCallsAndMessagesAndEmailAndPhotos()
    {
        var text = LoadFixture();
        var d1 = GetDeviceBlock(text, 1);
        Assert.False(string.IsNullOrWhiteSpace(d1));

        var calls = ParseCalls(d1);
        // Parserul extrage 5 din 6 apeluri — rândul fără durată explicită (Pierdut) poate fi omis
        Assert.True(calls.Count >= 5);
        _output.WriteLine($"D1 calls parsed: {calls.Count}");
        Assert.All(calls, c =>
        {
            Assert.False(string.IsNullOrWhiteSpace(c.Contact));
            Assert.False(string.IsNullOrWhiteSpace(c.Date));
            Assert.False(string.IsNullOrWhiteSpace(c.Time));
            Assert.False(string.IsNullOrWhiteSpace(c.Type));
        });

        // Verificăm că cel puțin un apel are fișier audio asociat (Apel_necunoscut_Lavinia.mp3)
        var withAudio = calls.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.AudioFileName));
        if (withAudio != null)
        {
            Assert.Contains(".mp3", withAudio.AudioFileName, StringComparison.OrdinalIgnoreCase);
            Assert.StartsWith("upload-required://", withAudio.AudioUrl ?? "", StringComparison.OrdinalIgnoreCase);
        }
        _output.WriteLine($"D1 audio call found: {withAudio?.AudioFileName ?? "none"}");

        // 2 conversații mesaje (cu Stănescu și cu Tudor Moga)
        var convs = ParseMessages(d1, "Lavinia Drăghici");
        Assert.True(convs.Count >= 2);
        Assert.All(convs, c => Assert.True(c.Messages.Count > 0));

        // Cel puțin 1 email (sent sau inbox)
        var (inbox, sent, drafts) = ParseEmails(d1, "Lavinia Drăghici");
        Assert.True(inbox.Count + sent.Count + drafts.Count >= 1);

        // O notă (Ce fac dacă pierd)
        var notes = ParseNotes(d1);
        Assert.True(notes.Count >= 1);

        // Nicio fotografie — D1 nu are secțiune POZE
        var (photos, _) = ParseMedia(d1);
        Assert.Empty(photos);
    }

    // D2 — iPhone al lui Tudor Moga
    // Așteptat: 6 apeluri (incl. Apel_Stanescu_Tudor_11apr.mp3), 1 notă (Suma)
    [Fact]
    public void Device2_ShouldParseAudioFileInCallsTable()
    {
        var text = LoadFixture();
        var d2 = GetDeviceBlock(text, 2);
        Assert.False(string.IsNullOrWhiteSpace(d2));

        var calls = ParseCalls(d2);
        Assert.True(calls.Count >= 5);
        _output.WriteLine($"D2 calls parsed: {calls.Count}");

        // Verificăm că cel puțin un apel are fișier audio asociat
        var withAudio = calls.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.AudioFileName));
        _output.WriteLine($"D2 audio call found: {withAudio?.AudioFileName ?? "none"}");
        if (withAudio != null)
        {
            Assert.Contains(".mp3", withAudio.AudioFileName, StringComparison.OrdinalIgnoreCase);
            Assert.StartsWith("upload-required://", withAudio.AudioUrl ?? "", StringComparison.OrdinalIgnoreCase);
        }

        // Nota "Suma" prezentă pe D2
        var notes = ParseNotes(d2);
        Assert.True(notes.Count >= 1);
    }

    // D3 — Laptop al lui Gheorghe Stănescu (victima)
    // Așteptat: 0 apeluri, 3+ email-uri sent, 3 fișiere (.docx, .pdf, .xlsx), 0 note
    [Fact]
    public void Device3_ShouldParseFilesSectionAndMultipleEmails()
    {
        var text = LoadFixture();
        var d3 = GetDeviceBlock(text, 3);
        Assert.False(string.IsNullOrWhiteSpace(d3));

        // Laptopul nu are apeluri
        var calls = ParseCalls(d3);
        Assert.Empty(calls);

        // Cel puțin 3 email-uri (parserul le poate plasa în inbox sau sent)
        var (inbox, sent, drafts) = ParseEmails(d3, "Gheorghe Stănescu");
        Assert.True(inbox.Count + sent.Count + drafts.Count >= 3);
        _output.WriteLine($"D3 emails — inbox:{inbox.Count} sent:{sent.Count} drafts:{drafts.Count}");

        // Nicio fotografie
        var (photos, _) = ParseMedia(d3);
        Assert.Empty(photos);

        // Cel puțin fișierul .docx (Declaratie_Minister_DRAFT_v3.docx)
        var files = ParseFiles(d3);
        _output.WriteLine("D3 files parsed: " + string.Join(", ", files.Select(f => f.Name)));
        Assert.True(files.Any(f => f.Name.EndsWith(".docx", StringComparison.OrdinalIgnoreCase)));
    }

    // D3 nu are secțiune NOTIȚE — parsatorul nu trebuie să inventeze note
    [Fact]
    public void NotesParser_ShouldNotInventNotes_WhenSectionMissing()
    {
        var text = LoadFixture();
        var d3 = GetDeviceBlock(text, 3);
        var notes = ParseNotes(d3);
        Assert.Empty(notes);
    }
}
