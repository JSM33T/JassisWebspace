using System.Text;
using Microsoft.AspNetCore.Http;

namespace JassSpace.Api.Extensions;

public static class MediaUrlHelper
{
    public static string GetBaseUrl(HttpRequest request)
        => $"{request.Scheme}://{request.Host}";

    public static string BuildMediaUrl(HttpRequest request, string blobName)
        => $"{GetBaseUrl(request)}/media/{blobName}";

    public static string? ToMediaUrl(HttpRequest request, string? value, string? containerName)
    {
        if (string.IsNullOrWhiteSpace(value))
            return value;

        var trimmed = value.Trim();

        // Already a media URL (absolute)
        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            if (absolute.AbsolutePath.StartsWith("/media/", StringComparison.OrdinalIgnoreCase))
                return trimmed;

            if (TryResolveBlobNameFromUrl(trimmed, containerName, out var blobName))
                return BuildMediaUrl(request, blobName);

            // External URL (keep as-is)
            return trimmed;
        }

        // Relative media path
        if (trimmed.StartsWith("/media/", StringComparison.OrdinalIgnoreCase))
            return $"{GetBaseUrl(request)}{trimmed}";

        // Treat as blob name
        return BuildMediaUrl(request, trimmed.TrimStart('/'));
    }

    public static bool TryExtractMediaBlobName(string urlOrPath, out string blobName)
    {
        blobName = string.Empty;
        if (string.IsNullOrWhiteSpace(urlOrPath))
            return false;

        var marker = "/media/";

        if (Uri.TryCreate(urlOrPath, UriKind.Absolute, out var absolute))
        {
            var path = absolute.AbsolutePath;
            var index = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index == -1)
                return false;

            var candidate = path[(index + marker.Length)..];
            if (string.IsNullOrWhiteSpace(candidate))
                return false;

            blobName = candidate;
            return true;
        }

        var relIndex = urlOrPath.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (relIndex == -1)
            return false;

        var relCandidate = urlOrPath[(relIndex + marker.Length)..];
        if (string.IsNullOrWhiteSpace(relCandidate))
            return false;

        blobName = relCandidate;
        return true;
    }

    public static bool TryResolveBlobNameFromUrl(string blobUrl, string? containerName, out string blobName)
    {
        blobName = string.Empty;

        if (!Uri.TryCreate(blobUrl, UriKind.Absolute, out var uri))
            return false;

        var pathSegments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments.Length == 0)
            return false;

        var container = containerName?.Trim('/') ?? string.Empty;
        var blobStartIndex = 0;
        var containerFound = false;

        if (!string.IsNullOrWhiteSpace(container))
        {
            for (var i = 0; i < pathSegments.Length; i++)
            {
                if (string.Equals(pathSegments[i], container, StringComparison.OrdinalIgnoreCase))
                {
                    blobStartIndex = i + 1;
                    containerFound = true;
                    break;
                }
            }
        }

        if (containerFound && blobStartIndex >= pathSegments.Length)
            return false;

        if (!containerFound && !string.IsNullOrWhiteSpace(container))
        {
            blobStartIndex = pathSegments.Length > 1 ? pathSegments.Length - 1 : 0;
        }

        var builder = new StringBuilder();
        for (var i = blobStartIndex; i < pathSegments.Length; i++)
        {
            if (builder.Length > 0)
                builder.Append('/');

            builder.Append(Uri.UnescapeDataString(pathSegments[i]));
        }

        var candidate = builder.ToString();
        if (string.IsNullOrWhiteSpace(candidate))
            return false;

        blobName = candidate;
        return true;
    }
}
