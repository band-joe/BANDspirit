using System.Security.Cryptography;
using System.Text;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace BandSpirit.Api.Services;

/// <summary>
/// Kapselt die Authentifizierungs-Logik: Login, Registrierung,
/// Passwort-Zurücksetzen (Token erstellen/validieren).
/// </summary>
public class AuthService
{
    private readonly BandSpiritDbContext _db;

    public AuthService(BandSpiritDbContext db) => _db = db;

    /// <summary>Prüft die Anmeldedaten und liefert bei Erfolg den Benutzer.</summary>
    /// <remarks>K81: Login nur für verifizierte Benutzer (EmailVerified = true).</remarks>
    public async Task<User?> ValidateCredentialsAsync(string email, string passwort)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && u.Aktiv);
        if (user is null || string.IsNullOrEmpty(user.Password))
        {
            return null;
        }
        
        // K81: Email muss verifiziert sein
        if (!user.EmailVerified)
        {
            return null;
        }
        
        return BCrypt.Net.BCrypt.Verify(passwort, user.Password) ? user : null;
    }

    /// <summary>Legt einen neuen Benutzer an (mit BCrypt-Passwort-Hash).</summary>
    /// <remarks>
    /// SICHERHEIT (SEC-M1): Die Rolle wird IMMER serverseitig auf "User" gesetzt,
    /// unabhängig vom übergebenen Parameter. Damit wird verhindert, dass sich ein
    /// Angreifer selbst als "Admin" registriert (CVE-ähnlich: CWE-639 Privilege Escalation).
    /// K81: EmailVerified = false (Benutzer muss E-Mail bestätigen vor Login).
    /// </remarks>
    public async Task<User> SignupAsync(string name, string email, string passwort, string role)
    {
        var existiert = await _db.Users.AnyAsync(u => u.Email == email);
        if (existiert)
        {
            throw new InvalidOperationException("E-Mail-Adresse ist bereits vergeben.");
        }

        var user = new User
        {
            Name = name,
            Email = email,
            Password = BCrypt.Net.BCrypt.HashPassword(passwort),
            // SEC-M1: Rolle serverseitig erzwingen – NIEMALS den Client-Wert übernehmen!
            Role = BenutzerRollenNamen.User,
            Aktiv = true,
            // K81: Email nicht verifiziert – Login erst nach Bestätigung möglich
            EmailVerified = false
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Erstellt einen Passwort-Reset-Token (gültig 1 Stunde).
    /// </summary>
    /// <remarks>
    /// SEC-M5: In der Datenbank wird nur der SHA-256-HASH des Tokens gespeichert.
    /// Der zurückgegebene Klartext-Token wird ausschliesslich per E-Mail an den
    /// Benutzer versendet. Selbst bei einem Datenbank-Leak lässt sich aus dem Hash
    /// kein gültiger Reset-Link rekonstruieren (CWE-256/CWE-522).
    /// SHA-256 (statt bcrypt) ist hier korrekt: Der Token ist ein zufälliger
    /// 256-Bit-Wert mit hoher Entropie – ein langsames Passwort-Hashing ist unnötig.
    /// </remarks>
    /// <returns>Der KLARTEXT-Token (für den E-Mail-Versand) oder null, falls der Benutzer nicht existiert.</returns>
    public async Task<string?> CreatePasswordResetTokenAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            // Aus Sicherheitsgründen keine Information über Existenz preisgeben.
            return null;
        }

        // Zufälligen Klartext-Token erzeugen (256 Bit Entropie).
        var klartextToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");

        var token = new PasswordResetToken
        {
            // SEC-M5: Nur den Hash speichern, nie den Klartext.
            Token = HashToken(klartextToken),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
        _db.PasswordResetTokens.Add(token);
        await _db.SaveChangesAsync();

        // Klartext zurückgeben – nur für den E-Mail-Versand.
        return klartextToken;
    }

    /// <summary>
    /// Setzt das Passwort anhand eines gültigen Tokens zurück.
    /// APP-08 (P005): Atomar – Token-Verbrauch und Passwortänderung in einer Transaktion
    /// mit konditionaler UsedAt-Prüfung (verhindert Doppelverwendung bei Concurrency).
    /// </summary>
    /// <remarks>SEC-M5: Der eingehende Klartext-Token wird gehasht und mit dem gespeicherten Hash verglichen.</remarks>
    public async Task<bool> ResetPasswordAsync(string token, string neuesPasswort)
    {
        // SEC-M5: Eingehenden Klartext-Token hashen und mit gespeichertem Hash vergleichen.
        var tokenHash = HashToken(token);

        // APP-08: Transaktion starten für atomaren Token-Verbrauch + Passwortänderung.
        await using var transaktion = await _db.Database.BeginTransactionAsync();

        var eintrag = await _db.PasswordResetTokens
            .FirstOrDefaultAsync(t => t.Token == tokenHash && t.UsedAt == null);

        if (eintrag is null || eintrag.ExpiresAt < DateTime.UtcNow)
        {
            await transaktion.RollbackAsync();
            return false;
        }

        var user = await _db.Users.FindAsync(eintrag.UserId);
        if (user is null)
        {
            await transaktion.RollbackAsync();
            return false;
        }

        // Passwort und UsedAt setzen; SaveChangesAsync führt konditionalen UPDATE aus
        // (WHERE Token = ... AND UsedAt IS NULL). Bei gleichzeitigem Request schlägt
        // der zweite fehl (0 betroffene Zeilen) und die Transaktion wird abgebrochen.
        user.Password = BCrypt.Net.BCrypt.HashPassword(neuesPasswort);
        eintrag.UsedAt = DateTime.UtcNow;
        
        var affected = await _db.SaveChangesAsync();
        if (affected == 0)
        {
            // Kein Token-Eintrag wurde aktualisiert (z. B. UsedAt zwischenzeitlich gesetzt).
            await transaktion.RollbackAsync();
            return false;
        }

        await transaktion.CommitAsync();
        return true;
    }

    /// <summary>
    /// K81: Erstellt einen Email-Verification-Token (gültig 24 Stunden).
    /// </summary>
    /// <remarks>
    /// Analog zu CreatePasswordResetTokenAsync: SHA-256-Hash wird in User.VerificationToken
    /// gespeichert, Klartext-Token wird per E-Mail versendet.
    /// </remarks>
    /// <returns>Der KLARTEXT-Token (für den E-Mail-Versand).</returns>
    public async Task<string> CreateEmailVerificationAsync(User user)
    {
        // Zufälligen Klartext-Token erzeugen (256 Bit Entropie)
        var klartextToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");

        // Nur Hash speichern (analog zu PasswordResetToken)
        user.VerificationToken = HashToken(klartextToken);
        user.VerificationTokenExpiry = DateTime.UtcNow.AddHours(24);
        await _db.SaveChangesAsync();

        return klartextToken;
    }

    /// <summary>
    /// K81: Verifiziert die E-Mail-Adresse anhand eines gültigen Tokens.
    /// </summary>
    /// <returns>true bei Erfolg, false wenn Token ungültig/abgelaufen ist.</returns>
    public async Task<bool> VerifyEmailAsync(string token)
    {
        var tokenHash = HashToken(token);

        var user = await _db.Users.FirstOrDefaultAsync(u => 
            u.VerificationToken == tokenHash &&
            u.VerificationTokenExpiry > DateTime.UtcNow);

        if (user is null)
        {
            return false;
        }

        // Email als verifiziert markieren, Token löschen (Single-Use)
        user.EmailVerified = true;
        user.VerificationToken = null;
        user.VerificationTokenExpiry = null;
        await _db.SaveChangesAsync();

        return true;
    }

    /// <summary>
    /// SEC-M5: Berechnet den SHA-256-Hash eines Tokens (Hex-kodiert).
    /// Deterministisch – identischer Token ergibt identischen Hash (für DB-Lookup).
    /// </summary>
    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    /// <summary>
    /// APP-02: Erstellt einen Refresh-Token für den Benutzer (gültig 7 Tage).
    /// Ermöglicht das Erneuern eines abgelaufenen Access-Tokens ohne erneute Anmeldung.
    /// </summary>
    public async Task<string> CreateRefreshTokenAsync(User user)
    {
        // Kryptografisch sicheren Zufallstoken erzeugen (256 Bit)
        var tokenBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(tokenBytes);
        var token = Convert.ToBase64String(tokenBytes);

        var refreshToken = new RefreshToken
        {
            Token = token,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return token;
    }

    /// <summary>
    /// APP-02: Validiert einen Refresh-Token und liefert den zugehörigen Benutzer.
    /// Markiert den Token als "verwendet" (Single-Use).
    /// </summary>
    public async Task<User?> ValidateRefreshTokenAsync(string token)
    {
        var refreshToken = await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == token);

        if (refreshToken is null || !refreshToken.IsValid)
        {
            return null;
        }

        // Token als verwendet markieren (Single-Use Pattern)
        refreshToken.UsedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return refreshToken.User;
    }

    /// <summary>
    /// APP-02: Widerruft alle Refresh-Tokens eines Benutzers (z. B. bei Logout oder Deaktivierung).
    /// </summary>
    public async Task RevokeAllRefreshTokensAsync(Guid userId)
    {
        var tokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }
}
