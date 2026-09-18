using BandSpirit.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BandSpirit.Api.Services;

/// <summary>
/// DSGVO-M1: Lösch-/Aufbewahrungskonzept.
///
/// Hintergrunddienst, der einmal täglich alte Daten gemäß definierter
/// Aufbewahrungsfristen automatisch löscht (Grundsatz der Speicherbegrenzung,
/// Art. 5 Abs. 1 lit. e DSGVO):
///   • Audit-Logs (AppLog) älter als N Tage (Standard: 90).
///   • Passwort-Reset-Tokens, die verwendet oder abgelaufen sind und deren
///     Erstellung länger als N Tage zurückliegt (Standard: 7).
///
/// Die Fristen sind über den Konfigurationsabschnitt "Retention" einstellbar.
/// Ein Wert von 0 (oder kleiner) deaktiviert die jeweilige Bereinigung.
/// </summary>
public class RetentionCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<RetentionCleanupService> _logger;

    // Ausführungsintervall: einmal pro Tag.
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    public RetentionCleanupService(
        IServiceScopeFactory scopeFactory,
        IConfiguration config,
        ILogger<RetentionCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _config = config;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Kurze Verzögerung nach dem Start, damit Migration/Seeding zuerst laufen.
        try
        {
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
        catch (TaskCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCleanupAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // Fehler dürfen den Dienst nicht dauerhaft beenden.
                _logger.LogError(ex, "DSGVO-Aufbewahrungs-Bereinigung fehlgeschlagen.");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }
    }

    private async Task RunCleanupAsync(CancellationToken ct)
    {
        var appLogDays = _config.GetValue<int>("Retention:AppLogDays", 90);
        var tokenDays = _config.GetValue<int>("Retention:PasswordResetTokenDays", 7);

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BandSpiritDbContext>();

        // ── Alte Audit-Logs löschen ──────────────────────────────────────────
        if (appLogDays > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-appLogDays);
            var deleted = await db.AppLogs
                .Where(l => l.CreatedAt < cutoff)
                .ExecuteDeleteAsync(ct);
            if (deleted > 0)
            {
                _logger.LogInformation(
                    "DSGVO-Bereinigung: {Count} Audit-Log-Einträge älter als {Days} Tage gelöscht.",
                    deleted, appLogDays);
            }
        }

        // ── Verwendete/abgelaufene Passwort-Reset-Tokens löschen ─────────────
        if (tokenDays > 0)
        {
            var cutoff = DateTime.UtcNow.AddDays(-tokenDays);
            var deleted = await db.PasswordResetTokens
                .Where(t => (t.UsedAt != null || t.ExpiresAt < DateTime.UtcNow)
                            && t.CreatedAt < cutoff)
                .ExecuteDeleteAsync(ct);
            if (deleted > 0)
            {
                _logger.LogInformation(
                    "DSGVO-Bereinigung: {Count} verbrauchte Passwort-Reset-Tokens gelöscht.",
                    deleted);
            }
        }
    }
}
