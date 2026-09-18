using BandSpirit.Api.Infrastructure.Data;
using BandSpirit.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OData.Deltas;
using Microsoft.AspNetCore.OData.Formatter;
using Microsoft.AspNetCore.OData.Query;
using Microsoft.AspNetCore.OData.Routing.Controllers;
using Microsoft.EntityFrameworkCore;

using BandSpirit.Api.Infrastructure.Auth;
namespace BandSpirit.Api.Controllers;

/// <summary>OData-Controller für Anträge (S3Proposal) inkl. Decide-Action. Route: /odata/Proposals</summary>
[Authorize]
public class ProposalsController : ODataController
{
    private readonly BandSpiritDbContext _db;

    public ProposalsController(BandSpiritDbContext db) => _db = db;

    [HttpGet]
    [EnableQuery(PageSize = 100)]
    [Authorize(Policy = Permissions.CircleRead)]
    public IQueryable<S3Proposal> Get() => _db.S3Proposals.AsQueryable();

    [HttpGet]
    [EnableQuery]
    [Authorize(Policy = Permissions.CircleRead)]
    public async Task<IActionResult> Get([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Proposals.FirstOrDefaultAsync(p => p.Id == key);
        return eintrag is null ? NotFound() : Ok(eintrag);
    }

    [HttpPost]
    [Authorize(Policy = Permissions.ProposalCreate)]
    public async Task<IActionResult> Post([FromBody] S3Proposal eintrag)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }
        _db.S3Proposals.Add(eintrag);
        await _db.SaveChangesAsync();
        return Created(eintrag);
    }

    [HttpPatch]
    [Authorize(Policy = Permissions.ProposalCreate)]
    public async Task<IActionResult> Patch([FromRoute] Guid key, [FromBody] Delta<S3Proposal> delta)
    {
        var eintrag = await _db.S3Proposals.FirstOrDefaultAsync(p => p.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        delta.Patch(eintrag);
        await _db.SaveChangesAsync();
        return Updated(eintrag);
    }

    [HttpDelete]
    [Authorize(Policy = Permissions.ProposalCreate)]
    public async Task<IActionResult> Delete([FromRoute] Guid key)
    {
        var eintrag = await _db.S3Proposals.FirstOrDefaultAsync(p => p.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        _db.S3Proposals.Remove(eintrag);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>POST /odata/Proposals({id})/Decide – Entscheidung über einen Antrag fällen.</summary>
    [HttpPost]
    [Authorize(Policy = Permissions.DecisionCreate)]
    public async Task<IActionResult> Decide([FromRoute] Guid key, [FromBody] ODataActionParameters parameters)
    {
        var eintrag = await _db.S3Proposals.FirstOrDefaultAsync(p => p.Id == key);
        if (eintrag is null)
        {
            return NotFound();
        }
        if (parameters is null || !parameters.TryGetValue("status", out var statusObj) || statusObj is null)
        {
            return BadRequest(new { fehler = "Parameter 'status' fehlt." });
        }

        var status = statusObj.ToString()!;
        eintrag.Status = status;

        // Bei Annahme eine Entscheidung protokollieren.
        if (status.Equals("ANGENOMMEN", StringComparison.OrdinalIgnoreCase))
        {
            _db.S3Decisions.Add(new S3Decision
            {
                ProposalId = eintrag.Id,
                Beschreibung = $"Antrag '{eintrag.Titel}' angenommen.",
                EntscheidDatum = DateTime.UtcNow
            });
        }
        await _db.SaveChangesAsync();
        return Ok(new { nachricht = $"Antragsstatus auf '{status}' gesetzt." });
    }
}
