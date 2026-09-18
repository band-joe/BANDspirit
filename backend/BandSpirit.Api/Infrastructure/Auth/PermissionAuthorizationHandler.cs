using System.Security.Claims;
using BandSpirit.Api.Services;
using Microsoft.AspNetCore.Authorization;

namespace BandSpirit.Api.Infrastructure.Auth;

/// <summary>
/// Prüft, ob die Rolle des aktuellen Benutzers die geforderte Berechtigung besitzt.
/// Nutzt den <see cref="RbacService"/> (DB + Cache).
/// </summary>
public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IServiceScopeFactory _scopeFactory;

    public PermissionAuthorizationHandler(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // Rolle aus den Claims lesen (Role-Claim).
        var role = context.User.FindFirstValue(ClaimTypes.Role)
                   ?? context.User.FindFirstValue("role");

        if (string.IsNullOrEmpty(role))
        {
            return;
        }

        // RbacService in eigenem Scope auflösen (Handler ist Singleton).
        using var scope = _scopeFactory.CreateScope();
        var rbacService = scope.ServiceProvider.GetRequiredService<RbacService>();

        var erlaubt = await rbacService.HasPermissionAsync(role, requirement.Permission);
        if (erlaubt)
        {
            context.Succeed(requirement);
        }
    }
}
