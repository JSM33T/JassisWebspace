using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using JassSpace.Api.Configuration;
using JassSpace.Contracts.Requests;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Services;

public sealed class OpenRouterBotService : IOpenRouterBotService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly OpenRouterSettings _settings;
    private readonly ILogger<OpenRouterBotService> _logger;

    public OpenRouterBotService(
        HttpClient httpClient,
        IOptions<OpenRouterSettings> settings,
        ILogger<OpenRouterBotService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value ?? new OpenRouterSettings();
        _logger = logger;
    }

    public async Task<BotChatCompletionResult> GetCompletionAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        using var request = CreateRequestMessage(messages, stream: false);
        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);

        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw CreateProviderException(payload, response.StatusCode);
        }

        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;
        var message = ExtractMessage(root);
        if (string.IsNullOrWhiteSpace(message))
        {
            throw new OpenRouterBotException("OpenRouter returned an empty completion.");
        }

        return new BotChatCompletionResult(
            message,
            ExtractModel(root),
            DateTimeOffset.UtcNow);
    }

    public async Task<BotChatCompletionResult> StreamCompletionAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        Func<string, CancellationToken, Task> onDelta,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(onDelta);
        EnsureConfigured();

        using var request = CreateRequestMessage(messages, stream: true);
        request.Headers.Accept.Clear();
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            throw CreateProviderException(payload, response.StatusCode);
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        var accumulatedData = new StringBuilder();
        var fullMessage = new StringBuilder();
        var resolvedModel = _settings.Model;

        while (!cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line is null)
            {
                break;
            }

            if (string.IsNullOrWhiteSpace(line))
            {
                if (accumulatedData.Length == 0)
                {
                    continue;
                }

                resolvedModel = await ProcessSsePayloadAsync(
                    accumulatedData.ToString(),
                    resolvedModel,
                    fullMessage,
                    onDelta,
                    cancellationToken);
                accumulatedData.Clear();
                continue;
            }

            if (line.StartsWith(":", StringComparison.Ordinal))
            {
                continue;
            }

            if (line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                var dataSegment = line["data:".Length..].TrimStart();
                if (accumulatedData.Length > 0)
                {
                    accumulatedData.Append('\n');
                }

                accumulatedData.Append(dataSegment);
            }
        }

        if (accumulatedData.Length > 0)
        {
            resolvedModel = await ProcessSsePayloadAsync(
                accumulatedData.ToString(),
                resolvedModel,
                fullMessage,
                onDelta,
                cancellationToken);
        }

        var finalMessage = fullMessage.ToString();
        if (string.IsNullOrWhiteSpace(finalMessage))
        {
            throw new OpenRouterBotException("OpenRouter returned an empty streamed completion.");
        }

        return new BotChatCompletionResult(
            finalMessage,
            resolvedModel,
            DateTimeOffset.UtcNow);
    }

    private HttpRequestMessage CreateRequestMessage(
        IReadOnlyList<BotChatMessageRequest> messages,
        bool stream)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);

        if (!string.IsNullOrWhiteSpace(_settings.SiteUrl))
        {
            request.Headers.TryAddWithoutValidation("HTTP-Referer", _settings.SiteUrl.Trim());
        }

        if (!string.IsNullOrWhiteSpace(_settings.SiteName))
        {
            request.Headers.TryAddWithoutValidation("X-Title", _settings.SiteName.Trim());
        }

        var payload = new Dictionary<string, object?>
        {
            ["model"] = _settings.Model,
            ["messages"] = BuildMessages(messages),
            ["stream"] = stream
        };

        if (_settings.Temperature.HasValue)
        {
            payload["temperature"] = _settings.Temperature.Value;
        }

        if (_settings.MaxTokens.HasValue)
        {
            payload["max_tokens"] = _settings.MaxTokens.Value;
        }

        request.Content = new StringContent(
            JsonSerializer.Serialize(payload, JsonOptions),
            Encoding.UTF8,
            "application/json");

        return request;
    }

    private IReadOnlyList<object> BuildMessages(IReadOnlyList<BotChatMessageRequest> messages)
    {
        var normalized = new List<object>(messages.Count + 1);

        if (!string.IsNullOrWhiteSpace(_settings.SystemPrompt))
        {
            normalized.Add(new
            {
                role = "system",
                content = _settings.SystemPrompt.Trim()
            });
        }

        foreach (var message in messages)
        {
            normalized.Add(new
            {
                role = message.Role.Trim().ToLowerInvariant(),
                content = message.Content.Trim()
            });
        }

        return normalized;
    }

    private async Task<string> ProcessSsePayloadAsync(
        string payload,
        string currentModel,
        StringBuilder fullMessage,
        Func<string, CancellationToken, Task> onDelta,
        CancellationToken cancellationToken)
    {
        if (string.Equals(payload, "[DONE]", StringComparison.Ordinal))
        {
            return currentModel;
        }

        using var document = JsonDocument.Parse(payload);
        var root = document.RootElement;

        if (TryExtractError(root, out var providerError))
        {
            throw new OpenRouterBotException(providerError);
        }

        var resolvedModel = ExtractModel(root, currentModel);
        var delta = ExtractDelta(root);
        if (!string.IsNullOrEmpty(delta))
        {
            fullMessage.Append(delta);
            await onDelta(delta, cancellationToken);
        }

        return resolvedModel;
    }

    private string ExtractModel(JsonElement root, string? fallback = null)
    {
        if (root.TryGetProperty("model", out var modelElement) && modelElement.ValueKind == JsonValueKind.String)
        {
            var model = modelElement.GetString();
            if (!string.IsNullOrWhiteSpace(model))
            {
                return model;
            }
        }

        return string.IsNullOrWhiteSpace(fallback) ? _settings.Model : fallback;
    }

    private static string ExtractMessage(JsonElement root)
    {
        if (!root.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array)
        {
            return string.Empty;
        }

        foreach (var choice in choices.EnumerateArray())
        {
            if (!choice.TryGetProperty("message", out var messageElement))
            {
                continue;
            }

            var content = ExtractContent(messageElement);
            if (!string.IsNullOrWhiteSpace(content))
            {
                return content;
            }
        }

        return string.Empty;
    }

    private static string ExtractDelta(JsonElement root)
    {
        if (!root.TryGetProperty("choices", out var choices) || choices.ValueKind != JsonValueKind.Array)
        {
            return string.Empty;
        }

        foreach (var choice in choices.EnumerateArray())
        {
            if (!choice.TryGetProperty("delta", out var deltaElement))
            {
                continue;
            }

            var delta = ExtractContent(deltaElement);
            if (!string.IsNullOrWhiteSpace(delta))
            {
                return delta;
            }
        }

        return string.Empty;
    }

    private static string ExtractContent(JsonElement element)
    {
        if (!element.TryGetProperty("content", out var contentElement))
        {
            return string.Empty;
        }

        return ExtractContentValue(contentElement);
    }

    private static string ExtractContentValue(JsonElement contentElement)
    {
        return contentElement.ValueKind switch
        {
            JsonValueKind.String => contentElement.GetString() ?? string.Empty,
            JsonValueKind.Array => string.Concat(
                contentElement
                    .EnumerateArray()
                    .Select(ExtractContentPart)
                    .Where(static part => !string.IsNullOrWhiteSpace(part))),
            _ => string.Empty
        };
    }

    private static string ExtractContentPart(JsonElement part)
    {
        if (part.ValueKind == JsonValueKind.String)
        {
            return part.GetString() ?? string.Empty;
        }

        if (part.ValueKind != JsonValueKind.Object)
        {
            return string.Empty;
        }

        if (part.TryGetProperty("text", out var textElement) && textElement.ValueKind == JsonValueKind.String)
        {
            return textElement.GetString() ?? string.Empty;
        }

        if (part.TryGetProperty("content", out var nestedContent))
        {
            return ExtractContentValue(nestedContent);
        }

        return string.Empty;
    }

    private static bool TryExtractError(JsonElement root, out string message)
    {
        message = string.Empty;

        if (root.TryGetProperty("error", out var errorElement))
        {
            message =
                TryReadString(errorElement, "message")
                ?? TryReadString(root, "message")
                ?? "OpenRouter returned an error.";
            return true;
        }

        return false;
    }

    private static string? TryReadString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
    }

    private OpenRouterBotException CreateProviderException(string payload, System.Net.HttpStatusCode statusCode)
    {
        try
        {
            using var document = JsonDocument.Parse(payload);
            if (TryExtractError(document.RootElement, out var providerError))
            {
                return new OpenRouterBotException(providerError, (int)statusCode);
            }
        }
        catch (JsonException ex)
        {
            _logger.LogDebug(ex, "Failed to parse OpenRouter error payload.");
        }

        var detail = string.IsNullOrWhiteSpace(payload)
            ? $"OpenRouter request failed with status code {(int)statusCode}."
            : payload;

        return new OpenRouterBotException(detail, (int)statusCode);
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new OpenRouterBotException("OpenRouter API key is not configured.", StatusCodes.Status503ServiceUnavailable);
        }
    }
}

public sealed class OpenRouterBotException : Exception
{
    public OpenRouterBotException(string message, int? statusCode = null)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int? StatusCode { get; }
}
