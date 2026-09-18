namespace BandSpirit.Api.Infrastructure.Config;

/// <summary>
/// CC-M4: Typisierte Konfiguration für JWT-Token.
/// Wird über IOptions&lt;JwtOptions&gt; injiziert.
/// </summary>
public class JwtOptions
{
    /// <summary>Konfigurationsabschnitt in appsettings.json.</summary>
    public const string Section = "Jwt";

    /// <summary>Signaturschlüssel (min. 32 Zeichen, aus Secret-Store).</summary>
    public string Secret { get; set; } = string.Empty;

    /// <summary>Token-Aussteller (Issuer).</summary>
    public string Issuer { get; set; } = "BandSpirit";

    /// <summary>Token-Empfänger (Audience).</summary>
    public string Audience { get; set; } = "BandSpirit";

    /// <summary>Token-Gültigkeitsdauer in Minuten (Standard: 480 = 8 Stunden).</summary>
    public int ExpiresInMinutes { get; set; } = 480;
}
