using System.Reflection;
using MurderMystery.Api.DTOs;
using MurderMystery.Api.Services;
using Xunit.Abstractions;

namespace MurderMystery.Api.Tests;

public class ForensicParsersTests
{
    private readonly ITestOutputHelper _output;

    public ForensicParsersTests(ITestOutputHelper output)
    {
        _output = output;
    }
    private static string LoadFixture() =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Povestea.txt"));

    private static string GetDeviceBlock(string fullText, int deviceNumber)
    {
        // Simple, deterministic segmentation for tests:
        // "DISPOZITIV X —" up to next "DISPOZITIV Y —" or end.
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

    private static (List<GeneratedPhoto> Photos, List<GeneratedFileItem> MediaFiles) ParseMedia(string deviceBlock)
        => ((List<GeneratedPhoto>, List<GeneratedFileItem>))InvokePrivateStatic(typeof(GameService), "ParseMediaRequirementsFromStory", deviceBlock)!;

    [Fact]
    public void Device1_ShouldParseCallsAndMessagesAndEmailAndPhotos()
    {
        var text = LoadFixture();
        var d1 = GetDeviceBlock(text, 1);
        Assert.False(string.IsNullOrWhiteSpace(d1));

        var calls = ParseCalls(d1);
        Assert.Equal(6, calls.Count);
        Assert.All(calls, c =>
        {
            Assert.False(string.IsNullOrWhiteSpace(c.Contact));
            Assert.False(string.IsNullOrWhiteSpace(c.Date));
            Assert.False(string.IsNullOrWhiteSpace(c.Time));
            Assert.False(string.IsNullOrWhiteSpace(c.Type));
        });

        var convs = ParseMessages(d1, "Elodiei Ghinescu");
        Assert.True(convs.Count >= 3);
        Assert.All(convs, c => Assert.True(c.Messages.Count > 0));

        var (inbox, sent, drafts) = ParseEmails(d1, "Elodiei Ghinescu");
        Assert.True(inbox.Count + sent.Count + drafts.Count >= 1);

        var (photos, files) = ParseMedia(d1);
        Assert.True(photos.Count >= 2);
        Assert.Empty(files); // Device1 has POZE but no FIȘIERE section
    }

    [Fact]
    public void Device2_ShouldParseAudioFileInCallsTable()
    {
        var text = LoadFixture();
        var d2 = GetDeviceBlock(text, 2);
        Assert.False(string.IsNullOrWhiteSpace(d2));

        var calls = ParseCalls(d2);
        Assert.True(calls.Count >= 6);

        var withAudio = calls.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.AudioFileName));
        Assert.NotNull(withAudio);
        Assert.Contains(".mp3", withAudio!.AudioFileName, StringComparison.OrdinalIgnoreCase);
        Assert.StartsWith("upload-required://", withAudio.AudioUrl ?? "", StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Device3_ShouldParseFilesSectionAndMultipleEmails()
    {
        var text = LoadFixture();
        var d3 = GetDeviceBlock(text, 3);
        Assert.False(string.IsNullOrWhiteSpace(d3));

        var (inbox, sent, drafts) = ParseEmails(d3, "Gabriel Ionescu");
        Assert.True(inbox.Count + sent.Count + drafts.Count >= 2);

        var (photos, files) = ParseMedia(d3);
        Assert.Empty(photos);
        _output.WriteLine("D3 files parsed: " + string.Join(", ", files.Select(f => f.Name)));
        Assert.True(files.Any(f => f.Name.EndsWith(".docx", StringComparison.OrdinalIgnoreCase)));
    }

    [Fact]
    public void Device4_ShouldParseFilesSectionAndEmail()
    {
        var text = LoadFixture();
        var d4 = GetDeviceBlock(text, 4);
        Assert.False(string.IsNullOrWhiteSpace(d4));

        var (inbox, sent, drafts) = ParseEmails(d4, "Victor Pană");
        Assert.True(inbox.Count + sent.Count + drafts.Count >= 1);

        var (photos, files) = ParseMedia(d4);
        Assert.Empty(photos);
        _output.WriteLine("D4 files parsed: " + string.Join(", ", files.Select(f => f.Name)));
        Assert.True(files.Any(f => f.Name.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase)));
    }

    [Fact]
    public void NotesParser_ShouldNotInventNotes_WhenSectionMissing()
    {
        var text = LoadFixture();
        var d4 = GetDeviceBlock(text, 4);
        var notes = ParseNotes(d4);
        Assert.Empty(notes);
    }
}
