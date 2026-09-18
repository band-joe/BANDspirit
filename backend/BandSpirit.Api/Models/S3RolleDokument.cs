namespace BandSpirit.Api.Models;

/// <summary>Ein hochgeladenes Dokument, das einer Rolle zugeordnet ist.</summary>
public class S3RolleDokument : AuditableEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>ID der zugehörigen Rolleninstanz (optional, historisch – neue Einträge hängen an der Rollendefinition).</summary>
    public Guid? RoleId { get; set; }

    /// <summary>Zugehörige Rolleninstanz (Navigation).</summary>
    public S3Role? Role { get; set; }

    /// <summary>ID der zugehörigen Rollendefinition (Einstellungen → Rollen).</summary>
    public Guid? RollenDefinitionId { get; set; }

    /// <summary>Zugehörige Rollendefinition (Navigation).</summary>
    public S3RollenDefinition? RollenDefinition { get; set; }

    /// <summary>Ursprünglicher Dateiname.</summary>
    public string Dateiname { get; set; } = string.Empty;

    /// <summary>Speicherpfad (Schlüssel) im Objektspeicher (MinIO/S3).</summary>
    public string StoragePfad { get; set; } = string.Empty;

    /// <summary>MIME-Typ der Datei.</summary>
    public string MimeType { get; set; } = string.Empty;

    /// <summary>Dateigröße in Bytes.</summary>
    public long DateigroesseBytes { get; set; }

    /// <summary>Zeitpunkt des Uploads (UTC).</summary>
    public DateTime HochgeladenAm { get; set; } = DateTime.UtcNow;
}
