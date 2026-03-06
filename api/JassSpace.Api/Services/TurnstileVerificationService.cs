using System.Text.Json.Serialization;
using JassSpace.Api.Configuration;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Services;

public sealed class TurnstileVerificationService : ITurnstileVerificationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TurnstileOptions _options;
    private readonly ILogger<TurnstileVerificationService> _logger;

    public TurnstileVerificationService(
        IHttpClientFactory httpClientFactory,
        IOptions<TurnstileOptions> options,
        ILogger<TurnstileVerificationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value ?? new TurnstileOptions();
        _logger = logger;
    }

    public async Task<TurnstileVerificationResult> VerifyAsync(
        string? token,
        string? remoteIpAddress,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            return TurnstileVerificationResult.Passed;
        }

        if (string.IsNullOrWhiteSpace(_options.SecretKey))
        {
            _logger.LogError("Turnstile is enabled but SecretKey is not configured.");
            return new TurnstileVerificationResult(false, ["missing-input-secret"]);
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return new TurnstileVerificationResult(false, ["missing-input-response"]);
        }

        var postBody = new Dictionary<string, string>
        {
            ["secret"] = _options.SecretKey.Trim(),
            ["response"] = token.Trim(),
        };

        if (!string.IsNullOrWhiteSpace(remoteIpAddress))
        {
            postBody["remoteip"] = remoteIpAddress.Trim();
        }

        try
        {
            var client = _httpClientFactory.CreateClient(nameof(TurnstileVerificationService));
            using var response = await client.PostAsync(
                _options.VerifyUrl,
                new FormUrlEncodedContent(postBody),
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Turnstile verification endpoint returned {StatusCode}.", response.StatusCode);
                return new TurnstileVerificationResult(false, [$"http-{(int)response.StatusCode}"]);
            }

            var payload = await response.Content.ReadFromJsonAsync<TurnstileVerifyResponse>(cancellationToken);
            if (payload is null)
            {
                return new TurnstileVerificationResult(false, ["invalid-json"]);
            }

            if (payload.Success)
            {
                return TurnstileVerificationResult.Passed;
            }

            var errors = payload.ErrorCodes is { Length: > 0 }
                ? payload.ErrorCodes.Where(static code => !string.IsNullOrWhiteSpace(code)).ToArray()
                : Array.Empty<string>();

            return new TurnstileVerificationResult(false, errors);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Turnstile verification failed due to an unexpected error.");
            return new TurnstileVerificationResult(false, ["verification-failed"]);
        }
    }

    private sealed class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}

