using System.Net;

namespace JassSpace.Api.Services;

/// <summary>
/// Resolves the real client IP address, honoring proxy headers such as X-Forwarded-For.
/// </summary>
public interface IClientIpResolver
{
    IPAddress? GetClientIp(HttpContext httpContext);
}
