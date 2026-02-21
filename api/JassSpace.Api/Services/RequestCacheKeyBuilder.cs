using System.Security.Cryptography;
using System.Text;
using JassSpace.Api.Configuration;
using JassSpace.Api.Filters;

namespace JassSpace.Api.Services;

public sealed class RequestCacheKeyBuilder(ICacheSubjectResolver subjectResolver) : IRequestCacheKeyBuilder
{
    public CacheKeyContext? TryBuild(HttpContext httpContext, CachedResponseAttribute attribute)
    {
        var normalizedBaseKey = CacheKeyFormatter.NormalizeSegment(attribute.BaseKey);
        var subject = subjectResolver.ResolveSubject(httpContext, attribute.Scope);
        if (string.IsNullOrWhiteSpace(subject))
        {
            return null;
        }

        var normalizedSubjectKey = CacheKeyFormatter.NormalizeSegment(subject);
        var fingerprint = BuildFingerprint(httpContext, attribute);
        var hash = ComputeSha256Hex(fingerprint);
        var cacheKey = $"cache:{normalizedBaseKey}:{normalizedSubjectKey}:{hash}";

        return new CacheKeyContext(normalizedBaseKey, normalizedSubjectKey, cacheKey);
    }

    private static string BuildFingerprint(HttpContext httpContext, CachedResponseAttribute attribute)
    {
        var request = httpContext.Request;
        var builder = new StringBuilder();

        builder.Append(request.Method.ToUpperInvariant());
        builder.Append('|');
        builder.Append(request.Path.ToString().ToLowerInvariant());

        if (attribute.VaryByQuery && request.Query.Count > 0)
        {
            var queryPairs = request.Query
                .SelectMany(
                    item => item.Value,
                    (item, value) => new KeyValuePair<string, string>(item.Key, value ?? string.Empty))
                .OrderBy(item => item.Key, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Value, StringComparer.Ordinal);

            foreach (var pair in queryPairs)
            {
                builder.Append('|');
                builder.Append(pair.Key.ToLowerInvariant());
                builder.Append('=');
                builder.Append(pair.Value);
            }
        }

        if (attribute.VaryByHeaders.Length > 0)
        {
            foreach (var headerName in attribute.VaryByHeaders
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(name => name, StringComparer.OrdinalIgnoreCase))
            {
                if (!request.Headers.TryGetValue(headerName, out var values))
                {
                    continue;
                }

                builder.Append('|');
                builder.Append("h:");
                builder.Append(headerName.ToLowerInvariant());
                builder.Append('=');
                builder.Append(values.ToString());
            }
        }

        return builder.ToString();
    }

    private static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
