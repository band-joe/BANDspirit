using StackExchange.Redis;

namespace BandSpirit.Api.Services;

/// <summary>
/// SEC-M6: Verwaltet die Sperrliste (Blacklist) für widerrufene JWTs.
/// Beim Logout wird die eindeutige Token-ID (jti) in Redis abgelegt – mit einer
/// Ablaufzeit (TTL), die dem Rest der Token-Gültigkeit entspricht. So werden
/// gesperrte Einträge automatisch entfernt, sobald das Token ohnehin abgelaufen wäre.
///
/// APP-04: Fehlerbehandlung — fail-closed statt fail-open
/// - RevokeAsync: Wirft Exception, wenn Redis nicht erreichbar → Logout-Fehler wird propagiert
/// - IsRevokedAsync: Gibt true zurück (Token ablehnen) wenn Redis nicht erreichbar
///   (vorsichtige Restriktion statt Verfügbarkeit über Sicherheit)
/// </summary>
public class TokenBlacklistService
{
    private const string KeyPrefix = "jwt:blacklist:";

    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<TokenBlacklistService> _logger;

    public TokenBlacklistService(ILogger<TokenBlacklistService> logger, IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _redis = redis;
    }

    /// <summary>
    /// Setzt einen Token (per jti) auf die Sperrliste bis zu seinem regulären Ablauf.
    /// APP-04: Fehler werden PROPAGIERT, nicht geschluckt.
    /// Ist Redis nicht erreichbar, wirft eine Exception.
    /// </summary>
    /// <param name="jti">Eindeutige Token-ID (jti-Claim).</param>
    /// <param name="expiresAt">Regulärer Ablaufzeitpunkt des Tokens (UTC).</param>
    /// <exception cref="InvalidOperationException">Wirft, wenn Redis nicht erreichbar oder Sperrung fehlschlägt.</exception>
    public async Task RevokeAsync(string jti, DateTime expiresAt)
    {
        if (string.IsNullOrEmpty(jti))
        {
            return;
        }

        var ttl = expiresAt - DateTime.UtcNow;
        if (ttl <= TimeSpan.Zero)
        {
            // Token bereits abgelaufen – kein Eintrag nötig.
            return;
        }

        if (_redis is null || !_redis.IsConnected)
        {
            // APP-04: Fehler PROPAGIEREN – nicht fail-open fahren
            var msg = "Redis nicht verfügbar – Token-Sperrung kann nicht garantiert werden.";
            _logger.LogError(msg);
            throw new InvalidOperationException(msg);
        }

        try
        {
            var db = _redis.GetDatabase();
            await db.StringSetAsync(KeyPrefix + jti, "revoked", ttl);
            _logger.LogInformation("Token gesperrt (jti={Jti}, gültig noch {Minutes} Min).", jti, (int)ttl.TotalMinutes);
        }
        catch (Exception ex)
        {
            // Fehler PROPAGIEREN
            _logger.LogError(ex, "Fehler beim Sperren des Tokens (jti={Jti}).", jti);
            throw new InvalidOperationException($"Token-Sperrung fehlgeschlagen (jti={jti}).", ex);
        }
    }

    /// <summary>Prüft, ob ein Token (per jti) gesperrt wurde.</summary>
    /// <returns>true = gesperrt; false = gültig oder (bei Redis-Fehler → true = fail-closed, lieber ablehnen).</returns>
    public async Task<bool> IsRevokedAsync(string jti)
    {
        if (string.IsNullOrEmpty(jti))
        {
            return false;
        }

        if (_redis is null || !_redis.IsConnected)
        {
            // APP-04: Fail-closed — bei Redis-Ausfall Token lieber ablehnen als akzeptieren
            _logger.LogWarning("Redis nicht verfügbar – Token-Prüfung wird konservativ durchgeführt (Token als gesperrt angenommen).");
            return true;
        }

        try
        {
            var db = _redis.GetDatabase();
            return await db.KeyExistsAsync(KeyPrefix + jti);
        }
        catch (Exception ex)
        {
            // Fehler → fail-closed: Token ablehnen
            _logger.LogError(ex, "Fehler beim Prüfen der Token-Sperrliste (jti={Jti}) – konservative Restriktion.", jti);
            return true;
        }
    }
}
