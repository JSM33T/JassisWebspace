using System.Security.Claims;

namespace JassSpace.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value
                 ?? principal.FindFirst("sub")?.Value;
                 
        return Guid.TryParse(value, out var guid) ? guid : Guid.Empty;
    }
}
