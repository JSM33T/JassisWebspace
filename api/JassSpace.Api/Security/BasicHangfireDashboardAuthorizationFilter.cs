using System.Security.Cryptography;
using System.Text;
using Hangfire.Dashboard;

namespace JassSpace.Api.Security;

public sealed class BasicHangfireDashboardAuthorizationFilter(string username, string password) : IDashboardAuthorizationFilter
{
    private readonly string _username = NormalizeCredential(username);
    private readonly string _password = NormalizeCredential(password);

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        var authHeader = httpContext.Request.Headers.Authorization.FirstOrDefault() ?? string.Empty;

        if (!TryParseBasicCredentials(authHeader, out var inputUsername, out var inputPassword))
        {
            Deny(httpContext);
            return false;
        }

        if (!SecureEquals(_username, inputUsername) || !SecureEquals(_password, inputPassword))
        {
            Deny(httpContext);
            return false;
        }

        return true;
    }

    private static void Deny(HttpContext context)
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Hangfire Dashboard\"";
    }

    private static bool TryParseBasicCredentials(string authHeader, out string username, out string password)
    {
        username = string.Empty;
        password = string.Empty;

        if (string.IsNullOrWhiteSpace(authHeader) ||
            !authHeader.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var encoded = authHeader["Basic ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(encoded))
        {
            return false;
        }

        try
        {
            var raw = Encoding.Latin1.GetString(Convert.FromBase64String(encoded));
            var separatorIndex = raw.IndexOf(':');
            if (separatorIndex <= 0)
            {
                return false;
            }

            username = NormalizeCredential(raw[..separatorIndex]);
            password = NormalizeCredential(raw[(separatorIndex + 1)..]);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string NormalizeCredential(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var normalized = value.Trim();

        if ((normalized.Length >= 2 &&
            normalized.StartsWith('"') &&
            normalized.EndsWith('"')) ||
            (normalized.Length >= 2 &&
            normalized.StartsWith('\'') &&
            normalized.EndsWith('\'')))
        {
            normalized = normalized[1..^1].Trim();
        }

        return normalized;
    }

    private static bool SecureEquals(string expected, string provided)
    {
        var left = Encoding.UTF8.GetBytes(expected);
        var right = Encoding.UTF8.GetBytes(provided);

        if (left.Length != right.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(left, right);
    }
}
