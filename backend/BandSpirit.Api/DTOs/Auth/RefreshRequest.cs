namespace BandSpirit.Api.DTOs.Auth;

/// <summary>
/// Request-DTO für den Refresh-Endpoint (APP-02).
/// Enthält den Refresh-Token, der gegen einen neuen Access-Token eingetauscht wird.
/// </summary>
public class RefreshRequest
{
    /// <summary>Der Refresh-Token (aus der vorherigen Login-Response).</summary>
    public string RefreshToken { get; set; } = string.Empty;
}
