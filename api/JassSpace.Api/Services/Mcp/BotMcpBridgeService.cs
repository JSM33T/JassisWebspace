using System.Text;
using System.Text.RegularExpressions;
using JassSpace.Api.Configuration;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Services;

public sealed partial class BotMcpBridgeService(
    ISystemStatusProbeService systemStatusProbeService,
    ISiteContentSearchService siteContentSearchService,
    IOptions<OpenRouterSettings> openRouterSettings,
    ILogger<BotMcpBridgeService> logger)
    : IBotMcpBridgeService
{
    private readonly string? _siteBaseUrl = NormalizeSiteBaseUrl(openRouterSettings.Value?.SiteUrl);

    private static readonly string[] StatusSubjects =
    [
        "system", "site", "server", "api", "backend", "service", "app",
        "application", "database", "db", "redis", "cache"
    ];

    private static readonly string[] StatusSignals =
    [
        "status", "health", "uptime", "running", "online", "down",
        "healthy", "unhealthy", "alive", "reachable", "working", "okay", "ok"
    ];

    private static readonly string[] SearchSignals =
    [
        "search", "find", "show", "looking for", "look for", "do you have",
        "any blog", "any blogs", "any gallery", "any galleries", "recommend", "related"
    ];

    private static readonly string[] SearchIntentPhrases =
    [
        "do you have anything about",
        "do you have anything on",
        "do you have anything for",
        "do you have anything related to",
        "do you have anything like",
        "what do you have about",
        "what do you have on",
        "what do you have for",
        "what do you have related to",
        "what do you have like",
        "anything about",
        "anything on",
        "anything for",
        "anything related to",
        "anything like",
        "something about",
        "something on",
        "something for",
        "something related to",
        "something like"
    ];

    private static readonly string[] SearchSubjects =
    [
        "blog", "blogs", "post", "posts", "article", "articles",
        "gallery", "galleries", "album", "albums", "photo", "photos", "image", "images"
    ];

    private static readonly string[] SearchTopicConnectors =
    [
        "related to", "regarding", "about", "like", "for", "on"
    ];

    private static readonly string[] SearchLeadPhrases =
    [
        "find me ", "find ", "show me ", "show ", "search for ", "search ",
        "look for ", "looking for ", "where can i find ", "do you have ", "what do you have "
    ];

    public async Task<BotMcpBridgeResult> ResolveAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        CancellationToken cancellationToken = default)
    {
        var latestUserMessage = messages.LastOrDefault(message =>
            string.Equals(message.Role, "user", StringComparison.Ordinal) &&
            !string.IsNullOrWhiteSpace(message.Content));

        if (latestUserMessage is null)
        {
            return new BotMcpBridgeResult(messages);
        }

        try
        {
            if (ShouldUseContentSearchTool(latestUserMessage.Content))
            {
                var searchQuery = ExtractSearchQuery(latestUserMessage.Content);
                var searchResults = await siteContentSearchService.SearchAsync(
                    searchQuery,
                    cancellationToken: cancellationToken);

                logger.LogInformation("Applying MCP content_search tool response for bot request.");
                return new BotMcpBridgeResult(
                    messages,
                    BuildContentSearchDirectResponse(searchQuery, searchResults),
                    "mcp/content_search");
            }

            var toolMessages = new List<BotChatMessageRequest>(1);

            if (ShouldUseSystemStatusTool(latestUserMessage.Content))
            {
                var snapshot = await systemStatusProbeService.GetSnapshotAsync(cancellationToken);
                logger.LogInformation("Applying MCP system_status tool context for bot request.");
                toolMessages.Add(new("system", BuildSystemStatusToolMessage(snapshot)));
            }

            if (toolMessages.Count == 0)
            {
                return new BotMcpBridgeResult(messages);
            }

            var enrichedMessages = new List<BotChatMessageRequest>(messages.Count + toolMessages.Count);
            enrichedMessages.AddRange(toolMessages);
            enrichedMessages.AddRange(messages);
            return new BotMcpBridgeResult(enrichedMessages);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to apply MCP tool context.");

            return new BotMcpBridgeResult(
                messages,
                "The live tool for this request is currently unavailable. Please try again in a moment.",
                "mcp/unavailable");
        }
    }

    private static bool ShouldUseSystemStatusTool(string input)
    {
        var normalized = input.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return false;
        }

        var hasSubject = StatusSubjects.Any(normalized.Contains);
        var hasSignal = StatusSignals.Any(normalized.Contains);

        return (hasSubject && hasSignal)
            || normalized.Contains("system status", StringComparison.Ordinal)
            || normalized.Contains("site status", StringComparison.Ordinal)
            || normalized.Contains("server status", StringComparison.Ordinal)
            || normalized.Contains("api status", StringComparison.Ordinal)
            || normalized.Contains("backend status", StringComparison.Ordinal);
    }

    private static bool ShouldUseContentSearchTool(string input)
    {
        var normalized = input.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalized) || ShouldUseSystemStatusTool(normalized))
        {
            return false;
        }

        var hasSubject = SearchSubjects.Any(normalized.Contains);
        var hasSignal = SearchSignals.Any(normalized.Contains);
        var hasIntentPhrase = SearchIntentPhrases.Any(normalized.Contains);
        var hasForcedSubjectQuery = HasSearchSubjectWithTopicConnector(normalized);

        return (hasSubject && hasSignal)
            || hasIntentPhrase
            || hasForcedSubjectQuery
            || normalized.StartsWith("where can i find ", StringComparison.Ordinal)
            || normalized.StartsWith("find me ", StringComparison.Ordinal)
            || normalized.StartsWith("show me ", StringComparison.Ordinal)
            || normalized.StartsWith("search ", StringComparison.Ordinal);
    }

    private static bool HasSearchSubjectWithTopicConnector(string normalized)
    {
        return SearchSubjects.Any(subject =>
            SearchTopicConnectors.Any(connector =>
                normalized.Contains($"{subject} {connector} ", StringComparison.Ordinal)));
    }

    private static string BuildSystemStatusToolMessage(SystemStatusSnapshot snapshot)
    {
        var builder = new StringBuilder();
        builder.AppendLine("MCP tool result: `system_status`.");
        builder.AppendLine("Use this live data as the source of truth for questions about the current JassSpace system status.");
        builder.AppendLine($"OverallStatus: {snapshot.OverallStatus}");
        builder.AppendLine($"CheckedAtUtc: {snapshot.CheckedAt:O}");
        builder.AppendLine($"Environment: {snapshot.Environment}");
        builder.AppendLine($"Machine: {snapshot.Machine}");
        builder.AppendLine($"Framework: {snapshot.Framework}");
        builder.AppendLine($"OS: {snapshot.OS} ({snapshot.OSArchitecture})");
        builder.AppendLine($"ProcessArchitecture: {snapshot.ProcessArchitecture}");
        builder.AppendLine($"ProcessStartUtc: {snapshot.ProcessStartUtc:O}");
        builder.AppendLine($"Uptime: {snapshot.Uptime}");
        builder.AppendLine("Dependencies:");

        foreach (var dependency in snapshot.Dependencies)
        {
            builder.AppendLine(
                $"- {dependency.Name}: {dependency.Status}. {dependency.Detail} CheckedAtUtc={dependency.CheckedAt:O}");
        }

        builder.Append(
            "If the user is asking about status, answer briefly and mention degraded dependencies clearly. " +
            "Do not invent any dependency that is not listed.");

        return builder.ToString();
    }

    private string BuildContentSearchDirectResponse(
        string query,
        IReadOnlyList<SiteContentSearchResult> results)
    {
        var siteBaseUrl = _siteBaseUrl;
        var builder = new StringBuilder();
        var escapedQuery = EscapeMarkdownText(query.Trim());
        var hasMultipleContentTypes = results
            .Select(result => result.ContentType)
            .Distinct(StringComparer.Ordinal)
            .Count() > 1;

        if (results.Count == 0)
        {
            builder.Append("I checked the published blogs and galleries on JassSpace, ");
            builder.Append($"but I couldn't find anything matching **{escapedQuery}**.");
            return builder.ToString();
        }

        builder.AppendLine($"I checked the published blogs and galleries on JassSpace. Here are some results for **{escapedQuery}**.");
        builder.AppendLine();
        builder.AppendLine(BuildSearchHeading(results));
        builder.AppendLine();

        foreach (var group in results.GroupBy(result => result.ContentType, StringComparer.Ordinal))
        {
            if (hasMultipleContentTypes)
            {
                builder.AppendLine(string.Equals(group.Key, "Blog", StringComparison.Ordinal) ? "### Blogs" : "### Galleries");
                builder.AppendLine();
            }

            foreach (var result in group)
            {
                var link = BuildSiteUrl(result.Link, siteBaseUrl);
                builder.AppendLine($"#### [{EscapeMarkdownText(result.Title)}]({link})");

                var thumbnailUrl = BuildAllowedThumbnailUrl(result.ThumbnailUrl, siteBaseUrl);
                if (!string.IsNullOrWhiteSpace(thumbnailUrl))
                {
                    builder.AppendLine($"![{EscapeMarkdownText(result.Title)}]({thumbnailUrl})");
                }

                builder.AppendLine($"_{EscapeMarkdownText(result.Meta)}_");

                if (!string.IsNullOrWhiteSpace(result.Summary))
                {
                    builder.AppendLine(EscapeMarkdownText(result.Summary.Trim()));
                }

                builder.AppendLine();
            }
        }

        return builder.ToString();
    }

    private static string BuildSearchHeading(IReadOnlyList<SiteContentSearchResult> results)
    {
        var contentTypes = results
            .Select(result => result.ContentType)
            .Distinct(StringComparer.Ordinal)
            .ToList();

        return contentTypes.Count switch
        {
            1 when string.Equals(contentTypes[0], "Blog", StringComparison.Ordinal) => "## Here are some blog results",
            1 when string.Equals(contentTypes[0], "Gallery", StringComparison.Ordinal) => "## Here are some gallery results",
            _ => "## Here are some results"
        };
    }

    private static string ExtractSearchQuery(string input)
    {
        var collapsedInput = CollapseWhitespace(input);
        if (string.IsNullOrWhiteSpace(collapsedInput))
        {
            return input.Trim();
        }

        var lowerInput = collapsedInput.ToLowerInvariant();
        foreach (var connector in SearchTopicConnectors)
        {
            var marker = $" {connector} ";
            var connectorIndex = lowerInput.LastIndexOf(marker, StringComparison.Ordinal);
            if (connectorIndex < 0)
            {
                continue;
            }

            var extracted = TrimTopic(collapsedInput[(connectorIndex + marker.Length)..]);
            if (!string.IsNullOrWhiteSpace(extracted))
            {
                return extracted;
            }
        }

        foreach (var leadPhrase in SearchLeadPhrases)
        {
            if (!lowerInput.StartsWith(leadPhrase, StringComparison.Ordinal))
            {
                continue;
            }

            var extracted = TrimTopic(collapsedInput[leadPhrase.Length..]);
            if (!string.IsNullOrWhiteSpace(extracted))
            {
                return extracted;
            }
        }

        return TrimTopic(collapsedInput);
    }

    private static string BuildSiteUrl(string pathOrUrl, string? siteBaseUrl)
    {
        if (Uri.TryCreate(pathOrUrl, UriKind.Absolute, out var absoluteUrl))
        {
            return absoluteUrl.ToString();
        }

        if (string.IsNullOrWhiteSpace(siteBaseUrl))
        {
            return pathOrUrl.StartsWith('/') ? pathOrUrl : $"/{pathOrUrl}";
        }

        return new Uri(new Uri(siteBaseUrl), pathOrUrl.StartsWith('/') ? pathOrUrl : $"/{pathOrUrl}").ToString();
    }

    private static string? BuildAllowedThumbnailUrl(string? pathOrUrl, string? siteBaseUrl)
    {
        if (string.IsNullOrWhiteSpace(pathOrUrl))
        {
            return null;
        }

        if (!Uri.TryCreate(pathOrUrl, UriKind.Absolute, out var absoluteUrl))
        {
            return BuildSiteUrl(pathOrUrl, siteBaseUrl);
        }

        if (string.IsNullOrWhiteSpace(siteBaseUrl) || !Uri.TryCreate(siteBaseUrl, UriKind.Absolute, out var siteBaseUri))
        {
            return null;
        }

        return string.Equals(siteBaseUri.Host, absoluteUrl.Host, StringComparison.OrdinalIgnoreCase)
            ? absoluteUrl.ToString()
            : null;
    }

    private static string EscapeMarkdownText(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("[", "\\[", StringComparison.Ordinal)
            .Replace("]", "\\]", StringComparison.Ordinal)
            .Replace("(", "\\(", StringComparison.Ordinal)
            .Replace(")", "\\)", StringComparison.Ordinal);
    }

    private static string CollapseWhitespace(string value)
    {
        return WhitespaceRegex().Replace(value.Trim(), " ");
    }

    private static string TrimTopic(string value)
    {
        var trimmed = value.Trim().Trim(' ', '.', ',', ';', ':', '!', '?', '"', '\'');
        return trimmed;
    }

    private static string? NormalizeSiteBaseUrl(string? siteUrl)
    {
        if (string.IsNullOrWhiteSpace(siteUrl))
        {
            return null;
        }

        var trimmed = siteUrl.Trim().TrimEnd('/');
        return Uri.TryCreate(trimmed, UriKind.Absolute, out _)
            ? $"{trimmed}/"
            : null;
    }

    [GeneratedRegex(@"\s+", RegexOptions.Compiled)]
    private static partial Regex WhitespaceRegex();
}
