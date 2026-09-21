using System.IdentityModel.Tokens.Jwt;
using BandSpirit.Api.DTOs.Auth;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>
/// REST-Controller für Authentifizierung (kein OData).
/// Endpunkte: login, entra-callback, forgot-password, reset-password, signup.
/// </summary>
[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly JwtTokenService _jwtService;
    private readonly NotificationService _notificationService;
    private readonly BandSpiritDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;
    private readonly TokenBlacklistService _tokenBlacklist;

    // SEC-M2: OIDC Configuration Manager für Microsoft Entra ID JWT-Validierung
    private static readonly IConfigurationManager<OpenIdConnectConfiguration> _oidcConfigManager =
        new ConfigurationManager<OpenIdConnectConfiguration>(
            "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
            new OpenIdConnectConfigurationRetriever(),
            new HttpDocumentRetriever());

    public AuthController(
        AuthService authService,
        JwtTokenService jwtService,
        NotificationService notificationService,
        BandSpiritDbContext db,
        IConfiguration config,
        ILogger<AuthController> logger,
        TokenBlacklistService tokenBlacklist)
    {
        _authService = authService;
        _jwtService = jwtService;
        _notificationService = notificationService;
        _db = db;
        _config = config;
        _logger = logger;
        _tokenBlacklist = tokenBlacklist;
    }

    /// <summary>POST /api/auth/login – Anmeldung mit Anmeldedaten.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _authService.ValidateCredentialsAsync(request.Email, request.Password);
        if (user is null)
        {
            return Unauthorized(new { fehler = "Ungültige Anmeldedaten." });
        }
        return Ok(BuildLoginResponse(user));
    }

    /// <summary>
    /// POST /api/auth/entra-callback – Tauscht ein Entra-ID-Token gegen ein C#-JWT.
    /// Der Benutzer wird anhand der E-Mail im Token gesucht bzw. bei Bedarf angelegt.
    /// </summary>
    /// <remarks>
    /// SEC-M2: Das Token wird VOLLSTÄNDIG validiert (Signatur, Issuer, Audience, Ablauf)
    /// gegen die öffentlichen Schlüssel von Microsoft Entra ID (JWKS-Endpunkt).
    /// Verhindert Auth-Bypass durch selbst signierte Tokens (CWE-347).
    /// </remarks>
    [HttpPost("entra-callback")]
    [AllowAnonymous]
    public async Task<IActionResult> EntraCallback([FromBody] EntraCallbackRequest request)
    {
        if (!_config.GetValue<bool>("AzureAd:Enabled"))
        {
            return BadRequest(new { fehler = "Entra-ID-Anmeldung ist nicht aktiviert." });
        }

        // SEC-M2: Token-SIGNATUR validieren gegen Microsoft OIDC-Schlüssel
        var tenantId = _config["AzureAd:TenantId"] ?? "common";
        var clientId = _config["AzureAd:ClientId"];

        if (string.IsNullOrEmpty(clientId))
        {
            _logger.LogError("AzureAd:ClientId ist nicht konfiguriert.");
            return StatusCode(500, new { fehler = "Entra-ID ist nicht korrekt konfiguriert." });
        }

        OpenIdConnectConfiguration oidcConfig;
        try
        {
            // OIDC-Konfiguration mit öffentlichen Schlüsseln abrufen
            oidcConfig = await _oidcConfigManager.GetConfigurationAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OIDC-Konfiguration konnte nicht abgerufen werden.");
            return StatusCode(500, new { fehler = "Token-Validierung fehlgeschlagen (Konfiguration)." });
        }

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuers = new[] 
            { 
                $"https://login.microsoftonline.com/{tenantId}/v2.0",
                $"https://sts.windows.net/{tenantId}/"
            },
            ValidateAudience = true,
            ValidAudiences = new[] { clientId },
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKeys = oidcConfig.SigningKeys,
            ClockSkew = TimeSpan.FromMinutes(5)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            // VOLLSTÄNDIGE Validierung (Signatur, Issuer, Audience, Lifetime)
            var principal = tokenHandler.ValidateToken(request.IdToken, validationParameters, out var validatedToken);
            var jwt = (JwtSecurityToken)validatedToken;

            // Claims extrahieren
            var email = principal.FindFirst(c => c.Type is "email" or "preferred_username" or "upn")?.Value;
            var name = principal.FindFirst("name")?.Value ?? email;
            
            if (string.IsNullOrEmpty(email))
            {
                return BadRequest(new { fehler = "Token enthält keine E-Mail-Adresse." });
            }

            // Benutzer suchen oder provisionieren
            // DB-13: Normalisierter Vergleich, sonst würde ein Entra-ID-Claim mit
            // abweichender Gross-/Kleinschreibung fälschlich einen Duplikat-Account anlegen.
            var emailCanonical = Services.AuthService.NormalizeEmail(email);
            var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailCanonical == emailCanonical);
            if (user is null)
            {
                // Just-in-Time-Provisionierung (immer als "User")
                user = new User
                {
                    Name = name ?? email,
                    Email = email,
                    Role = BenutzerRollenNamen.User,
                    Aktiv = true
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
                _logger.LogInformation("Neuer Benutzer via Entra-ID provisioniert: {Email}", email);
            }

            if (!user.Aktiv)
            {
                return Unauthorized(new { fehler = "Benutzer ist deaktiviert." });
            }

            return Ok(BuildLoginResponse(user));
        }
        catch (SecurityTokenException ex)
        {
            _logger.LogWarning(ex, "Entra-ID-Token-Validierung fehlgeschlagen: {Message}", ex.Message);
            return Unauthorized(new { fehler = "Token-Validierung fehlgeschlagen (ungültige Signatur oder Claims)." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fehler bei Entra-Callback.");
            return StatusCode(500, new { fehler = "Interner Fehler bei der Authentifizierung." });
        }
    }

    /// <summary>POST /api/auth/forgot-password – Passwort-Reset-Token anfordern.</summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // SEC-M5: CreatePasswordResetTokenAsync liefert den KLARTEXT-Token zurück
        // (in der DB liegt nur der Hash). Der Klartext geht ausschliesslich per E-Mail raus.
        var klartextToken = await _authService.CreatePasswordResetTokenAsync(request.Email);
        if (klartextToken is not null)
        {
            // K80: E-Mail-Versand robust kapseln. Ein Fehler beim externen
            // E-Mail-Provider (MessageBird) darf NICHT zu HTTP 500 führen –
            // (a) sonst leckt der Statuscode die Konto-Existenz (SEC-M5) und
            // (b) der Reset-Token wurde bereits in der DB erstellt.
            // Der Fehler wird protokolliert; der Endpunkt antwortet trotzdem mit 200.
            try
            {
                await _notificationService.SendPasswordResetAsync(request.Email, klartextToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Passwort-Reset-E-Mail konnte nicht versendet werden (MessageBird). " +
                    "Token wurde erstellt, aber nicht zugestellt.");
            }
        }
        // Immer 200, um keine Rückschlüsse auf existierende Konten zuzulassen.
        return Ok(new { nachricht = "Falls die E-Mail existiert, wurde ein Reset-Link versendet." });
    }

    /// <summary>POST /api/auth/reset-password – Passwort mit Token zurücksetzen.</summary>
    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        var erfolg = await _authService.ResetPasswordAsync(request.Token, request.NewPassword);
        if (!erfolg)
        {
            return BadRequest(new { fehler = "Token ungültig oder abgelaufen." });
        }
        return Ok(new { nachricht = "Passwort wurde erfolgreich zurückgesetzt." });
    }

    /// <summary>K81: POST /api/auth/verify-email – E-Mail-Adresse mit Token verifizieren.</summary>
    [HttpPost("verify-email")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        var erfolg = await _authService.VerifyEmailAsync(request.Token);
        if (!erfolg)
        {
            return BadRequest(new { fehler = "Verification-Token ungültig oder abgelaufen." });
        }
        return Ok(new { nachricht = "E-Mail erfolgreich bestätigt. Sie können sich jetzt anmelden." });
    }

    /// <summary>K81: POST /api/auth/resend-verification – Verification-E-Mail erneut senden.</summary>
    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request)
    {
        var emailCanonical = Services.AuthService.NormalizeEmail(request.Email);
        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailCanonical == emailCanonical);

        // Immer 200 zurückgeben (analog zu forgot-password), um keine Konto-Existenz preiszugeben
        if (user is null || user.EmailVerified)
        {
            // Konto existiert nicht oder ist bereits verifiziert → trotzdem 200
            return Ok(new { nachricht = "Falls die E-Mail existiert und nicht verifiziert ist, wurde ein neuer Link versendet." });
        }

        // Neuen Verification-Token erstellen
        var klartextToken = await _authService.CreateEmailVerificationAsync(user);

        // E-Mail senden (robust gekapselt wie in forgot-password)
        try
        {
            await _notificationService.SendEmailVerificationAsync(user.Email, klartextToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Verification-E-Mail konnte nicht versendet werden (MessageBird). " +
                "Token wurde erstellt, aber nicht zugestellt.");
        }

        return Ok(new { nachricht = "Falls die E-Mail existiert und nicht verifiziert ist, wurde ein neuer Link versendet." });
    }

    /// <summary>POST /api/auth/signup – Neuen Benutzer registrieren.</summary>
    /// <remarks>
    /// APP-13 (P005): Nur noch für authentifizierte Admins verfügbar (staff-only Enrollment).
    /// Verhindert Selbst-Registrierung durch Externe (Privilege Escalation, CWE-284).
    /// SEC-M1: Die Rolle wird in SignupAsync serverseitig erzwungen (immer "User"),
    /// unabhängig vom Request-Inhalt.
    /// K81: Nach Registrierung wird Verification-E-Mail versendet (kein sofortiger Login).
    /// </remarks>
    [HttpPost("signup")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Signup([FromBody] SignupRequest request)
    {
        try
        {
            // Hinweis: Der "role"-Parameter wird ignoriert; SignupAsync setzt immer "User".
            var user = await _authService.SignupAsync(request.Name, request.Email, request.Password, BenutzerRollenNamen.User);
            
            // K81: Verification-Token erstellen und E-Mail senden
            var klartextToken = await _authService.CreateEmailVerificationAsync(user);
            
            try
            {
                await _notificationService.SendEmailVerificationAsync(user.Email, klartextToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Verification-E-Mail konnte nicht versendet werden (MessageBird). " +
                    "Benutzer {Email} wurde erstellt, aber Token nicht zugestellt.", user.Email);
            }
            
            return Ok(new 
            { 
                nachricht = "Benutzer erfolgreich erstellt. Bitte E-Mail-Adresse bestätigen.",
                email = user.Email 
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { fehler = ex.Message });
        }
    }

    /// <summary>
    /// POST /api/auth/logout – Meldet den Benutzer ab und sperrt das aktuelle Token.
    /// </summary>
    /// <remarks>
    /// SEC-M6: Das aktuelle Token (per jti) wird bis zu seinem regulären Ablauf auf die
    /// Sperrliste gesetzt. Danach wird es bei jeder Anfrage abgewiesen. Da JWTs zustandslos
    /// sind, ist dies der Standard-Mechanismus, um ein Token vorzeitig ungültig zu machen
    /// (z. B. bei Logout oder Deaktivierung eines Benutzers).
    /// </remarks>
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        var jti = User.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        var expClaim = User.FindFirst(JwtRegisteredClaimNames.Exp)?.Value;

        if (string.IsNullOrEmpty(jti))
        {
            // Kein jti (z. B. altes Token vor SEC-M6) – nichts zu sperren.
            return Ok(new { nachricht = "Abgemeldet." });
        }

        // Ablaufzeitpunkt aus dem exp-Claim (Unix-Sekunden) bestimmen.
        var expiresAt = DateTime.UtcNow.AddHours(8);
        if (long.TryParse(expClaim, out var expUnix))
        {
            expiresAt = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
        }

        try
        {
            // APP-04: RevokeAsync wirft jetzt Exception bei Redis-Fehler
            await _tokenBlacklist.RevokeAsync(jti, expiresAt);
            _logger.LogInformation("Benutzer {UserId} hat sich abgemeldet (Token gesperrt).",
                User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value);
            return Ok(new { nachricht = "Erfolgreich abgemeldet." });
        }
        catch (InvalidOperationException ex)
        {
            // APP-04: Redis-Fehler → 503 Service Unavailable
            _logger.LogError(ex, "Token-Sperrung fehlgeschlagen (Redis nicht verfügbar).");
            return StatusCode(503, new { fehler = "Logout fehlgeschlagen: Token-Sperrung nicht möglich (Infrastruktur-Fehler)." });
        }
    }

    /// <summary>
    /// POST /api/auth/refresh – Erneuert ein abgelaufenes Access-Token mit einem Refresh-Token.
    /// </summary>
    /// <remarks>
    /// APP-02: Der Refresh-Token wird validiert und bei Erfolg wird ein neuer Access-Token
    /// (und ein neuer Refresh-Token) ausgestellt. Der alte Refresh-Token wird als "verwendet"
    /// markiert (Single-Use Pattern).
    /// </remarks>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        var user = await _authService.ValidateRefreshTokenAsync(request.RefreshToken);
        if (user is null)
        {
            return Unauthorized(new { fehler = "Refresh-Token ungültig oder abgelaufen." });
        }

        if (!user.Aktiv)
        {
            return Unauthorized(new { fehler = "Benutzer ist deaktiviert." });
        }

        return Ok(BuildLoginResponse(user));
    }

    /// <summary>Erzeugt die Login-Antwort inkl. JWT und Refresh-Token.</summary>
    /// <remarks>
    /// APP-02: Jeder Login (inkl. Refresh) liefert einen neuen Refresh-Token (Token-Rotation).
    /// Der alte wird automatisch ungültig (Single-Use).
    /// </remarks>
    private LoginResponse BuildLoginResponse(User user)
    {
        var ttlStunden = int.TryParse(_config["Jwt:ExpiresHours"], out var h) ? h : 8;
        var refreshToken = _authService.CreateRefreshTokenAsync(user).Result;

        return new LoginResponse
        {
            Token = _jwtService.CreateToken(user),
            RefreshToken = refreshToken,
            UserId = user.Id.ToString(),
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            ExpiresAt = DateTime.UtcNow.AddHours(ttlStunden)
        };
    }
}
