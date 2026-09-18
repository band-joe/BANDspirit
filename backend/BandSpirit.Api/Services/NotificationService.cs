using System.Text;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace BandSpirit.Api.Services;

/// <summary>
/// Versendet Benachrichtigungen (E-Mails) über einen internen SMTP-Relay.
/// K82: Umstellung von MessageBird (Bird) REST-API auf SMTP (mail.band.local:25).
/// Nutzt MailKit für den SMTP-Versand.
/// </summary>
public class NotificationService
{
    private readonly IConfiguration _config;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IConfiguration config,
        ILogger<NotificationService> logger)
    {
        _config = config;
        _logger = logger;
    }

    // ── SMTP-Konfiguration ──
    // Host des internen Relays, z. B. "mail.band.local"
    private string SmtpHost => _config["Smtp:Host"] ?? string.Empty;
    private int SmtpPort => int.TryParse(_config["Smtp:Port"], out var p) ? p : 25;
    // Verschlüsselung: None (Port 25 intern), StartTls (587), SslOnConnect (465)
    private string SmtpSecurity => _config["Smtp:Security"] ?? "None";
    // Optionale Authentifizierung (interne Relays laufen oft ohne Auth)
    private string SmtpUser => _config["Smtp:User"] ?? string.Empty;
    private string SmtpPassword => _config["Smtp:Password"] ?? string.Empty;
    // Absender / Empfänger
    // Fallback auf die alten Bird__*-Variablen, damit bestehende .env-Werte weiter greifen
    private string FromEmail => _config["Smtp:FromEmail"] ?? _config["Bird:FromEmail"] ?? "noreply@band.ch";
    private string FromName => _config["Smtp:FromName"] ?? _config["Bird:FromName"] ?? "BANDspirit";
    private string AdminEmail => _config["Smtp:AdminEmail"] ?? _config["Bird:AdminEmail"] ?? "admin@band.ch";

    /// <summary>Sendet die Benachrichtigung "Passwort zurücksetzen".</summary>
    public async Task SendPasswordResetAsync(string email, string resetToken)
    {
        var resetUrl = $"{_config["App:BaseUrl"]}/passwort-zuruecksetzen?token={resetToken}";
        var subject = "BANDspirit — Passwort zurücksetzen";
        var body = $@"
<html>
<body>
    <h2>Passwort zurücksetzen</h2>
    <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
    <p><a href=""{resetUrl}"">Klicken Sie hier, um Ihr Passwort zurückzusetzen</a></p>
    <p>Dieser Link ist 1 Stunde gültig.</p>
    <p>Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail bitte.</p>
</body>
</html>";
        await SendEmailAsync(email, subject, body);
        _logger.LogInformation("Passwort-Reset-E-Mail an {Email} gesendet.", email);
    }

    /// <summary>K81: Sendet die Email-Verification nach Signup.</summary>
    public async Task SendEmailVerificationAsync(string email, string verificationToken)
    {
        var verifyUrl = $"{_config["App:BaseUrl"]}/email-bestaetigen?token={verificationToken}";
        var subject = "BANDspirit — E-Mail-Adresse bestätigen";
        var body = $@"
<html>
<body>
    <h2>Willkommen bei BANDspirit!</h2>
    <p>Um Ihr Konto zu aktivieren, bestätigen Sie bitte Ihre E-Mail-Adresse.</p>
    <p><a href=""{verifyUrl}"">Klicken Sie hier, um Ihre E-Mail zu bestätigen</a></p>
    <p>Dieser Link ist 24 Stunden gültig.</p>
    <p>Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail bitte.</p>
</body>
</html>";
        await SendEmailAsync(email, subject, body);
        _logger.LogInformation("Email-Verification an {Email} gesendet.", email);
    }

    /// <summary>Sendet eine Meeting-Einladung inkl. ICS-Kalendereintrag.</summary>
    public async Task SendMeetingInviteAsync(string email, string icsContent)
    {
        var subject = "BANDspirit — Meeting-Einladung";
        var body = @"
<html>
<body>
    <h2>Meeting-Einladung</h2>
    <p>Sie wurden zu einem Meeting eingeladen. Details finden Sie im angehängten Kalendereintrag.</p>
</body>
</html>";
        await SendEmailAsync(email, subject, body, icsContent);
        _logger.LogInformation("Meeting-Einladung an {Email} gesendet.", email);
    }

    /// <summary>Sendet eine Benachrichtigung über ein neu erstelltes Support-Ticket.</summary>
    public async Task SendSupportTicketCreatedAsync(string titel, string erstellerId)
    {
        var subject = $"Neues Support-Ticket: {titel}";
        var body = $@"
<html>
<body>
    <h2>Neues Support-Ticket</h2>
    <p><strong>Titel:</strong> {titel}</p>
    <p><strong>Ersteller-ID:</strong> {erstellerId}</p>
    <p>Bitte prüfen Sie das Ticket im System.</p>
</body>
</html>";
        await SendEmailAsync(AdminEmail, subject, body);
        _logger.LogInformation("Support-Ticket-Benachrichtigung für '{Titel}' an Admin gesendet.", titel);
    }

    /// <summary>
    /// Interner E-Mail-Versand über einen SMTP-Relay (z. B. mail.band.local:25) mittels MailKit.
    /// </summary>
    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody, string? icsAttachment = null)
    {
        if (string.IsNullOrWhiteSpace(SmtpHost))
        {
            _logger.LogWarning("SMTP-Host nicht konfiguriert (Smtp__Host fehlt) – E-Mail-Versand übersprungen.");
            return;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(FromName, FromEmail));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = htmlBody };

            if (!string.IsNullOrEmpty(icsAttachment))
            {
                // ICS-Kalendereintrag als Anhang beifügen
                builder.Attachments.Add(
                    "meeting.ics",
                    Encoding.UTF8.GetBytes(icsAttachment),
                    new ContentType("text", "calendar") { Parameters = { { "method", "REQUEST" } } });
            }

            message.Body = builder.ToMessageBody();

            // Verschlüsselungsoption bestimmen
            var secureOption = SmtpSecurity.ToLowerInvariant() switch
            {
                "starttls" => SecureSocketOptions.StartTls,
                "sslonconnect" or "ssl" => SecureSocketOptions.SslOnConnect,
                "auto" => SecureSocketOptions.Auto,
                _ => SecureSocketOptions.None // Port 25 intern, unverschlüsselt
            };

            using var client = new SmtpClient();
            await client.ConnectAsync(SmtpHost, SmtpPort, secureOption);

            // Authentifizierung nur, wenn Benutzer gesetzt ist (interne Relays oft ohne Auth)
            if (!string.IsNullOrEmpty(SmtpUser))
            {
                await client.AuthenticateAsync(SmtpUser, SmtpPassword);
            }

            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("E-Mail erfolgreich via SMTP ({Host}:{Port}) an {Email} gesendet (Betreff: {Subject})",
                SmtpHost, SmtpPort, toEmail, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fehler beim E-Mail-Versand an {Email} via SMTP ({Host}:{Port})", toEmail, SmtpHost, SmtpPort);
            throw;
        }
    }
}
