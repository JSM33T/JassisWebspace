namespace JassSpace.Api.Services;

public interface ITurnstileVerificationService
{
    Task<TurnstileVerificationResult> VerifyAsync(
        string? token,
        string? remoteIpAddress,
        CancellationToken cancellationToken = default);
}

public sealed record TurnstileVerificationResult(bool Success, IReadOnlyList<string> ErrorCodes)
{
    public static TurnstileVerificationResult Passed { get; } =
        new(true, Array.Empty<string>());
}

