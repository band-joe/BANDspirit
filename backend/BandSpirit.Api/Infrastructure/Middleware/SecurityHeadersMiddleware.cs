namespace BandSpirit.Api.Infrastructure.Middleware;

/// <summary>
/// Setzt sicherheitsrelevante HTTP-Header für jede Antwort.
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
        headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()";
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        // X-Powered-By explizit leeren/entfernen.
        headers.Remove("X-Powered-By");
        headers["X-Powered-By"] = string.Empty;

        await _next(context);
    }
}
