using Microsoft.AspNetCore.Authorization;

namespace BandSpirit.Api.Infrastructure.Auth;

/// <summary>
/// Autorisierungs-Anforderung, die eine bestimmte Berechtigung verlangt.
/// </summary>
public class PermissionRequirement : IAuthorizationRequirement
{
    /// <summary>Die geforderte Berechtigung (z. B. "user:read").</summary>
    public string Permission { get; }

    public PermissionRequirement(string permission) => Permission = permission;
}
