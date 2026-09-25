using System.Text;
using BandSpirit.Api.Controllers;
using FluentAssertions;
using Xunit;
using static BandSpirit.Api.Controllers.BiKompassUploadController;

namespace BandSpirit.Api.Tests.BiKompass;

/// <summary>
/// Tests für die Zeilen→Markdown-Umwandlung des BI-Kompass-PDF-Imports.
/// Schriftgrössen wie im BI-Kompass: Fliesstext 10 pt, Hauptkapitel 15 pt,
/// Unterkapitel 13 pt.
/// </summary>
public class PdfMarkdownTests
{
    private const double Fliesstext = 10;

    private static PdfZeile Text(string text) => new(text, Fliesstext);
    private static PdfZeile Kapitel(string text) => new(text, 15, IstFett: true);
    private static PdfZeile Unterkapitel(string text) => new(text, 13, IstFett: true);

    private static string Umwandeln(params PdfZeile[] zeilen)
    {
        var ausgabe = new StringBuilder();
        BiKompassUploadController.ZeilenAlsMarkdown(zeilen, Fliesstext, ausgabe);
        return ausgabe.ToString().Trim().Replace(Environment.NewLine, "\n");
    }

    [Fact]
    public void Kapitelnummer_WirdUeberschriftPassenderEbene()
    {
        var markdown = Umwandeln(
            Kapitel("1. Der BI-Kompass"),
            Unterkapitel("1.1. Zweck und Geltungsbereich"),
            Text("3.2.1. Sinn – Warum gibt es diesen Kreis?"),
            Text("Text"));

        markdown.Should().Be(
            "# 1. Der BI-Kompass\n## 1.1. Zweck und Geltungsbereich\n### 3.2.1. Sinn – Warum gibt es diesen Kreis?\nText");
    }

    [Fact]
    public void NummerierteListeInFliesstextgroesse_BleibtListe()
    {
        var markdown = Umwandeln(
            Unterkapitel("3.1. Kreise"),
            Text("1. Kreise haben Kontrolle darüber, wie sie arbeiten"),
            Text("2. Kreise repräsentieren eine Wertschöpfung"),
            Text("2 = Bedenken, die gehört werden sollen"));

        markdown.Should().Be(
            "## 3.1. Kreise\n1. Kreise haben Kontrolle darüber, wie sie arbeiten\n2. Kreise repräsentieren eine Wertschöpfung\n2 = Bedenken, die gehört werden sollen");
    }

    [Fact]
    public void UmbrocheneUeberschrift_WirdZusammengefuehrt()
    {
        var markdown = Umwandeln(
            Unterkapitel("2.3. Wo sind die fortlaufenden Verantwortlichkeiten, strategische Ziele"),
            Unterkapitel("sowie Entwicklungsziele abgebildet?"),
            Text("Fortlaufende Verantwortlichkeiten ..."));

        markdown.Should().Be(
            "## 2.3. Wo sind die fortlaufenden Verantwortlichkeiten, strategische Ziele sowie Entwicklungsziele abgebildet?\nFortlaufende Verantwortlichkeiten ...");
    }

    [Fact]
    public void UeberschriftGefolgtVonFliesstext_WirdNichtZusammengefuehrt()
    {
        var markdown = Umwandeln(
            Unterkapitel("8.2. Ablauf eines operativen- / Koordinations Meeting"),
            Text("Empfehlung: wöchentlich oder alle 2 Wochen."));

        markdown.Should().Be(
            "## 8.2. Ablauf eines operativen- / Koordinations Meeting\nEmpfehlung: wöchentlich oder alle 2 Wochen.");
    }

    [Fact]
    public void OhneBekannteSchriftgroesse_GiltJedeNummerAlsUeberschrift()
    {
        var ausgabe = new StringBuilder();
        BiKompassUploadController.ZeilenAlsMarkdown(new[] { new PdfZeile("1. Einleitung") }, 0, ausgabe);

        ausgabe.ToString().Trim().Should().Be("# 1. Einleitung");
    }

    [Fact]
    public void EinzeiligerInhaltsverzeichnisEintrag_WirdUebersprungen()
    {
        var markdown = Umwandeln(Text("1.1 Zweck und Geltungsbereich ................ 3"));

        markdown.Should().BeEmpty();
    }

    [Fact]
    public void UmbrochenerInhaltsverzeichnisEintrag_WirdKomplettUebersprungen()
    {
        var markdown = Umwandeln(
            Text("2.3. Wo sind die fortlaufenden Verantwortlichkeiten, strategische Ziele sowie"),
            Text("Entwicklungsziele abgebildet? ..................... 4"),
            Text("8.2. Ablauf eines operativen- / Koordinations Meeting Empfehlung: wöchentlich oder"),
            Text("alle 2 Wochen. ..................... 25"));

        markdown.Should().BeEmpty();
    }

    [Fact]
    public void InhaltsverzeichnisTitelMitFuellpunkten_WirdUebersprungen()
    {
        var markdown = Umwandeln(Text("Inhaltsverzeichnis BI-Kompass der Zusammenarbeit ............ 1"));

        markdown.Should().BeEmpty();
    }

    [Fact]
    public void UeberschriftGefolgtVonInhaltsverzeichnisZeile_BleibtUeberschrift()
    {
        var markdown = Umwandeln(Kapitel("1. Einleitung"), Text(""), Text("1.1 Zweck ........ 3"));

        markdown.Should().Be("# 1. Einleitung");
    }

    [Fact]
    public void SeitenFusszeile_WirdUebersprungen()
    {
        var markdown = Umwandeln(Text("Text"), Text("BI-Kompass der Zusammenarbeit Seite 3 von 27"));

        markdown.Should().Be("Text");
    }
}
