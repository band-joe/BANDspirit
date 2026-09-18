using BandSpirit.Api.DTOs;
using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für Benutzer (Users). Route: /odata/Users</summary>
[Authorize]
public class UsersController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public UsersController(BandSpiritDbContext db) => _db = db;

    /// <summary>GET /odata/Users – Liste aller Benutzer.</summary>
    /// <remarks>
    /// SEC-M4: Gibt UserDto zurück (ohne Password-Hash), um zu verhindern,
    /// dass Angreifer über $select=Password den BCrypt-Hash abrufen können.
    /// </remarks>
    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.UserRead)]
    public IQueryable<UserDto> Get() => _db.Users.Select(u => new UserDto
    {
        Id = u.Id,
        Name = u.Name,
        Email = u.Email,
        Role = u.Role,
        Aktiv = u.Aktiv,
        AbacusPersonalnummer = u.AbacusPersonalnummer,
        PortraetPfad = u.PortraetPfad,
        Telefon = u.Telefon,
        CreatedAt = u.CreatedAt,
        UpdatedAt = u.UpdatedAt,
        CreatedById = u.CreatedById,
        ChangedById = u.ChangedById,
        RowVersion = u.RowVersion
    });

    /// <summary>GET /odata/Users({id}) – Einzelnen Benutzer abrufen.</summary>
    /// <remarks>SEC-M4: Gibt UserDto zurück (ohne Password-Hash).</remarks>
    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.UserRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var userDto = await _db.Users
            .Where(u => u.Id == key)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Role = u.Role,
                Aktiv = u.Aktiv,
                AbacusPersonalnummer = u.AbacusPersonalnummer,
                PortraetPfad = u.PortraetPfad,
                Telefon = u.Telefon,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
                CreatedById = u.CreatedById,
                ChangedById = u.ChangedById,
                RowVersion = u.RowVersion
            })
            .FirstOrDefaultAsync();
        
        return userDto is null ? NotFound() : Ok(userDto);
    }

    /// <summary>POST /odata/Users – Neuen Benutzer anlegen.</summary>
    /// <remarks>
    /// Bindet an <see cref="UserDto"/> (nicht an die Entität <c>User</c>), weil der
    /// EntitySet "Users" im EDM-Modell auf UserDto typisiert ist. Würde hier direkt
    /// gegen die Entität gebunden, lehnte OData das gesendete Feld "password" als
    /// undeklarierte Eigenschaft mit 400 Bad Request ab.
    /// </remarks>
    [HttpPost]
    [Authorize(Policy = Permissions.UserCreate)]
    public async Task<IActionResult> Post([FromBody] UserDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        // Rolle muss eine gültige, aktive Benutzerrolle sein.
        var rollenFehler = await ValidiereRolleAsync(dto.Role);
        if (rollenFehler is not null)
        {
            return BadRequest(new { fehler = rollenFehler });
        }
        // Ein Passwort ist beim Anlegen zwingend erforderlich.
        if (string.IsNullOrEmpty(dto.Password))
        {
            return BadRequest(new { fehler = "Es muss ein Passwort angegeben werden." });
        }

        var user = new User
        {
            Name = dto.Name,
            Email = dto.Email,
            Role = dto.Role,
            Aktiv = dto.Aktiv,
            AbacusPersonalnummer = dto.AbacusPersonalnummer,
            PortraetPfad = dto.PortraetPfad,
            Telefon = dto.Telefon,
            // Passwort immer als BCrypt-Hash speichern, nie im Klartext.
            Password = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Antwort ohne Passwort-Hash zurückgeben (SEC-M4).
        return Created(MapToDto(user));
    }

    /// <summary>PATCH /odata/Users({id}) – Benutzer aktualisieren.</summary>
    /// <remarks>
    /// Bindet – wie POST – an <see cref="UserDto"/> (Delta&lt;UserDto&gt;), da der
    /// EntitySet "Users" auf UserDto typisiert ist. Die tatsächlich geänderten
    /// Felder werden anschließend gezielt auf die geladene <c>User</c>-Entität
    /// übertragen.
    /// </remarks>
    [HttpPatch]
    [Authorize(Policy = Permissions.UserUpdate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<UserDto> delta)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == key);
        if (user is null)
        {
            return NotFound();
        }
        var geaenderteFelder = delta.GetChangedPropertyNames().ToHashSet();

        // Delta auf ein temporäres DTO anwenden, um die neuen Werte auszulesen.
        var patched = new UserDto();
        delta.Patch(patched);

        // Nur die tatsächlich geänderten Felder auf die Entität übertragen.
        if (geaenderteFelder.Contains(nameof(UserDto.Name)))
        {
            user.Name = patched.Name;
        }
        if (geaenderteFelder.Contains(nameof(UserDto.Email)))
        {
            user.Email = patched.Email;
        }
        if (geaenderteFelder.Contains(nameof(UserDto.Aktiv)))
        {
            user.Aktiv = patched.Aktiv;
        }
        if (geaenderteFelder.Contains(nameof(UserDto.AbacusPersonalnummer)))
        {
            user.AbacusPersonalnummer = patched.AbacusPersonalnummer;
        }
        if (geaenderteFelder.Contains(nameof(UserDto.PortraetPfad)))
        {
            user.PortraetPfad = patched.PortraetPfad;
        }
        if (geaenderteFelder.Contains(nameof(UserDto.Telefon)))
        {
            user.Telefon = patched.Telefon;
        }
        // Falls die Rolle geändert wurde, gegen den Benutzerrollen-Katalog prüfen.
        if (geaenderteFelder.Contains(nameof(UserDto.Role)))
        {
            var rollenFehler = await ValidiereRolleAsync(patched.Role);
            if (rollenFehler is not null)
            {
                return BadRequest(new { fehler = rollenFehler });
            }
            user.Role = patched.Role;
        }
        // Falls das Passwort geändert wurde, erneut hashen.
        if (geaenderteFelder.Contains(nameof(UserDto.Password)) && !string.IsNullOrEmpty(patched.Password))
        {
            user.Password = BCrypt.Net.BCrypt.HashPassword(patched.Password);
        }

        // UI-31: Optimistic Locking via RowVersion.
        // Falls die RowVersion mitgesendet wurde, setzen wir sie auf die Entität.
        // EF Core prüft dann beim SaveChanges, ob sie noch aktuell ist.
        if (geaenderteFelder.Contains(nameof(UserDto.RowVersion)) && patched.RowVersion is not null)
        {
            user.RowVersion = patched.RowVersion;
        }

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // UI-31: RowVersion-Konflikt → Datensatz wurde zwischenzeitlich geändert.
            return Conflict(new
            {
                fehler = "Der Datensatz wurde zwischenzeitlich von einem anderen Benutzer geändert. Bitte laden Sie die Daten neu und wiederholen Sie die Änderung."
            });
        }

        // Antwort ohne Passwort-Hash zurückgeben (SEC-M4).
        return Updated(MapToDto(user));
    }

    /// <summary>DELETE /odata/Users({id}) – Benutzer löschen.</summary>
    [HttpDelete]
    [Authorize(Policy = Permissions.UserDelete)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == key);
        if (user is null)
        {
            return NotFound();
        }
        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Bildet eine <see cref="User"/>-Entität auf ein <see cref="UserDto"/> ab.
    /// SEC-M4: Das Feld <c>Password</c> wird bewusst NICHT gesetzt und bleibt null,
    /// damit der BCrypt-Hash niemals in einer Response erscheint.
    /// </summary>
    private static UserDto MapToDto(User user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role,
        Aktiv = user.Aktiv,
        AbacusPersonalnummer = user.AbacusPersonalnummer,
        PortraetPfad = user.PortraetPfad,
        Telefon = user.Telefon,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt,
        CreatedById = user.CreatedById,
        ChangedById = user.ChangedById,
        RowVersion = user.RowVersion
    };

    /// <summary>
    /// Prüft, ob der übergebene Rollenname einer aktiven Benutzerrolle entspricht.
    /// Liefert bei Fehler eine Meldung, sonst null.
    /// </summary>
    private async Task<string?> ValidiereRolleAsync(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return "Es muss eine Rolle angegeben werden.";
        }
        var existiertAktiv = await _db.BenutzerRollen
            .AnyAsync(r => r.Name == role && r.Aktiv);
        return existiertAktiv
            ? null
            : $"Die Rolle '{role}' ist keine gültige oder aktive Benutzerrolle.";
    }
}
