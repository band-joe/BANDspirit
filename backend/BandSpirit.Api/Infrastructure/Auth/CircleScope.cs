using System.Security.Claims;
using BandSpirit.Api.Infrastructure.Data;

namespace BandSpirit.Api.Infrastructure.Auth;

/// <summary>
/// Hilfsfunktionen zur kreis-bezogenen Zugriffssteuerung für KPIs und OKRs.
/// Ermittelt die Kreise, denen ein Benutzer über seine Rollenzuweisungen
/// (<see cref="Models.S3PersonRoleAssignment"/> → <see cref="Models.S3Role"/>.CircleId)
/// zugeordnet ist, und stellt Sichtbarkeits-/Schreibprüfungen bereit.
/// </summary>
public static class CircleScope
{
    /// <summary>Ermittelt die Benutzer-ID (Guid) aus den Claims oder null.</summary>
    public static Guid? GetUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(raw, out var id) ? id : null;
    }

    /// <summary>Gibt an, ob der Benutzer die Rolle "Admin" besitzt.</summary>
    public static bool IsAdmin(ClaimsPrincipal user) => user.IsInRole("Admin");

    /// <summary>
    /// Liefert die IDs aller Kreise, denen der Benutzer über eine Rollenzuweisung
    /// zugeordnet ist – als komponierbares <see cref="IQueryable{Guid}"/> (übersetzt in SQL-Subquery).
    /// </summary>
    public static IQueryable<Guid> UserCircleIds(BandSpiritDbContext db, Guid userId) =>
        db.S3PersonRoleAssignments
          .Where(a => a.UserId == userId && a.Role != null)
          .Select(a => a.Role!.CircleId)
          .Distinct();

    /// <summary>
    /// Prüft, ob der Benutzer auf einen Kreis schreibend zugreifen darf.
    /// Admins dürfen immer. Organisationsweite Objekte (CircleId == null) sind
    /// ausschliesslich Admins vorbehalten. Ansonsten muss der Benutzer dem Kreis
    /// zugeordnet sein.
    /// </summary>
    public static bool CanWrite(BandSpiritDbContext db, ClaimsPrincipal user, Guid? circleId)
    {
        if (IsAdmin(user))
        {
            return true;
        }
        if (circleId is null)
        {
            return false; // Organisationsweite Objekte nur durch Admins schreibbar.
        }
        var userId = GetUserId(user);
        if (userId is null)
        {
            return false;
        }
        return UserCircleIds(db, userId.Value).Contains(circleId.Value);
    }

    /// <summary>
    /// Prüft, ob der Benutzer ein Objekt eines bestimmten Kreises lesen darf.
    /// Admins und organisationsweite Objekte (CircleId == null) sind immer sichtbar.
    /// </summary>
    public static bool CanRead(BandSpiritDbContext db, ClaimsPrincipal user, Guid? circleId)
    {
        if (IsAdmin(user) || circleId is null)
        {
            return true;
        }
        var userId = GetUserId(user);
        if (userId is null)
        {
            return false;
        }
        return UserCircleIds(db, userId.Value).Contains(circleId.Value);
    }
}
