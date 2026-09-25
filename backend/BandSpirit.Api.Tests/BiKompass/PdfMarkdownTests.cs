using System.Text;
using BandSpirit.Api.Controllers;
using FluentAssertions;
using Xunit;

namespace BandSpirit.Api.Tests.BiKompass;

/// <summary>Tests für die Zeilen→Markdown-Umwandlung des BI-Kompass-PDF-Imports.</summary>
public class PdfMarkdownTests
{
    private static string Umwandeln(params string[] zeilen)
    {
        var ausgabe = new StringBuilder();
        BiKompassUploadController.ZeilenAlsMarkdown(zeilen, ausgabe);
        return ausgabe.ToString().Trim();
    }

    [Fact]
    public void Kapitelnummer_WirdUeberschriftPassenderEbene()
    {
        var markdown = Umwandeln("1. Einleitung", "1.1 Zweck und Geltungsbereich", "Text");

        markdown.Should().Be("# 1. Einleitung\n## 1.1. Zweck und Geltungsbereich\nText".Replace("\n", Environment.NewLine));
    }

    [Fact]
    public void EinzeiligerInhaltsverzeichnisEintrag_WirdUebersprungen()
    {
        var markdown = Umwandeln("1.1 Zweck und Geltungsbereich ................ 3");

        markdown.Should().BeEmpty();
    }

    [Fact]
    public void UmbrochenerInhaltsverzeichnisEintrag_WirdKomplettUebersprungen()
    {
        var markdown = Umwandeln(
            "2.3. Wo sind die fortlaufenden Verantwortlichkeiten, strategische Ziele sowie",
            "Entwicklungsziele abgebildet? ..................... 4",
            "8.2. Ablauf eines operativen- / Koordinations Meeting Empfehlung: wöchentlich oder",
            "alle 2 Wochen. ..................... 25");

        markdown.Should().BeEmpty();
    }

    [Fact]
    public void InhaltsverzeichnisTitelMitFuellpunkten_WirdUebersprungen()
    {
        var markdown = Umwandeln("Inhaltsverzeichnis BI-Kompass der Zusammenarbeit ............ 1");

        markdown.Should().BeEmpty();
    }

    [Fact]
    public void UeberschriftGefolgtVonKapitelzeile_BleibtUeberschrift()
    {
        var markdown = Umwandeln("1. Einleitung", "", "1.1 Zweck ........ 3");

        markdown.Should().StartWith("# 1. Einleitung");
    }

    [Fact]
    public void SeitenFusszeile_WirdUebersprungen()
    {
        var markdown = Umwandeln("Text", "BI-Kompass der Zusammenarbeit Seite 3 von 27");

        markdown.Should().Be("Text");
    }
}
