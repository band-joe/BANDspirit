namespace BandSpirit.Api.Models;

/// <summary>Ein Arbeitspaket, das aus einer Spannung/einem Treiber entsteht.</summary>
public class SpannungWorkItem : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID des zugehörigen Treibers.</summary>
    public Guid DriverId { get; set; }

    /// <summary>Zugehöriger Treiber (Navigation).</summary>
    public S3Driver? Driver { get; set; }

    /// <summary>Titel des Arbeitspakets.</summary>
    public string Titel { get; set; } = string.Empty;

    /// <summary>
    /// UI-12-Fix: Beschreibung. Frontend sammelte diesen Wert im Formular
    /// bereits, das Modell kannte ihn nicht - ging beim Anlegen verloren.
    /// </summary>
    public string? Beschreibung { get; set; }

    /// <summary>Status des Arbeitspakets.</summary>
    public string Status { get; set; } = "OFFEN";

    /// <summary>
    /// UI-12-Fix: Zugewiesener Benutzer. Das Formular erforderte eine
    /// Zuweisung, das Feld existierte aber nirgends im Modell - jede
    /// Zuweisung wurde bislang stillschweigend verworfen.
    /// </summary>
    public Guid? ZugewiesenAnId { get; set; }

    /// <summary>Zugewiesener Benutzer (Navigation, nicht über OData exponiert).</summary>
    public User? ZugewiesenAn { get; set; }
}
