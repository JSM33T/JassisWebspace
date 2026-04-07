using System.Net;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public sealed record AuthRequestContext(
    string BaseUrl,
    string? UserAgent = null,
    IPAddress? IpAddress = null
);

public sealed record AuthSessionPayload(
    AuthResponse Response,
    DateTimeOffset RefreshTokenExpiresAt
);

public enum AuthLoginStatus
{
    Success,
    InvalidCredentials,
    InactiveUser,
    EmailNotVerified
}

public sealed record AuthLoginResult(
    AuthLoginStatus Status,
    AuthSessionPayload? Session = null,
    string? ErrorMessage = null
);

public enum AuthRegisterStatus
{
    Success,
    RegistrationDisabled,
    InvalidUsername,
    InvalidPassword,
    EmailConflict,
    UsernameConflict
}

public sealed record AuthRegisterResult(
    AuthRegisterStatus Status,
    UserInfo? User = null,
    string? ErrorMessage = null
);

public enum AuthRefreshStatus
{
    Success,
    InvalidToken,
    ExpiredToken,
    RevokedToken
}

public sealed record AuthRefreshResult(
    AuthRefreshStatus Status,
    AuthSessionPayload? Session = null,
    string? ErrorMessage = null
);

public enum AuthVerifyEmailStatus
{
    Success,
    MissingToken,
    InvalidToken,
    ExpiredToken,
    AlreadyUsed,
    UserNotFound
}

public sealed record AuthVerifyEmailResult(
    AuthVerifyEmailStatus Status,
    VerificationSentResponse? Response = null,
    string? ErrorMessage = null
);

public enum AuthCurrentUserStatus
{
    Success,
    NotAuthenticated,
    UserNotFound
}

public sealed record AuthCurrentUserResult(
    AuthCurrentUserStatus Status,
    UserInfo? User = null,
    string? ErrorMessage = null
);

public enum AuthResendVerificationStatus
{
    Success,
    UserNotFound,
    AlreadyVerified
}

public sealed record AuthResendVerificationResult(
    AuthResendVerificationStatus Status,
    VerificationSentResponse? Response = null,
    string? ErrorMessage = null
);

public enum AuthResetPasswordStatus
{
    Success,
    InvalidRequest,
    InvalidToken,
    ExpiredToken,
    InvalidPassword
}

public sealed record AuthResetPasswordResult(
    AuthResetPasswordStatus Status,
    string? Message = null,
    string? ErrorMessage = null
);

public enum AuthSetPasswordStatus
{
    Success,
    UserNotFound,
    CurrentPasswordRequired,
    CurrentPasswordIncorrect,
    InvalidPassword
}

public sealed record AuthSetPasswordResult(
    AuthSetPasswordStatus Status,
    string? Message = null,
    string? ErrorMessage = null
);

public enum AuthOAuthStatus
{
    Success,
    OAuthNotConfigured,
    TokenExchangeFailed,
    UserInfoUnavailable
}

public sealed record AuthOAuthResult(
    AuthOAuthStatus Status,
    AuthSessionPayload? Session = null,
    string? ErrorMessage = null
);

public interface IAuthService
{
    Task<AuthLoginResult> LoginAsync(
        LoginRequest request,
        AuthRequestContext context,
        CancellationToken cancellationToken = default);

    Task<AvailabilityResponse> CheckUsernameAvailabilityAsync(
        string? username,
        CancellationToken cancellationToken = default);

    Task<AvailabilityResponse> CheckEmailAvailabilityAsync(
        string? email,
        CancellationToken cancellationToken = default);

    Task<AuthRegisterResult> RegisterAsync(
        RegisterRequest request,
        AuthRequestContext context,
        CancellationToken cancellationToken = default);

    Task<AuthRefreshResult> RefreshTokenAsync(
        string refreshToken,
        AuthRequestContext context,
        CancellationToken cancellationToken = default);

    Task<LogoutResponse> LogoutAsync(
        string? refreshToken,
        Guid? sessionId,
        CancellationToken cancellationToken = default);

    Task<AuthVerifyEmailResult> VerifyEmailAsync(
        VerifyEmailRequest request,
        CancellationToken cancellationToken = default);

    Task<AuthCurrentUserResult> GetCurrentUserAsync(
        Guid userId,
        Guid? sessionId,
        AuthRequestContext context,
        CancellationToken cancellationToken = default);

    Task<AuthResendVerificationResult> ResendVerificationAsync(
        ResendVerificationRequest request,
        CancellationToken cancellationToken = default);

    Task<VerificationSentResponse> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken = default);

    Task<AuthResetPasswordResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken = default);

    Task<AuthSetPasswordResult> SetPasswordAsync(
        SetPasswordRequest request,
        Guid? sessionId,
        CancellationToken cancellationToken = default);

    Task<AuthOAuthResult> AuthenticateWithGitHubAsync(
        string code,
        AuthRequestContext context,
        CancellationToken cancellationToken = default);

    Task<AuthOAuthResult> AuthenticateWithGoogleAsync(
        string code,
        AuthRequestContext context,
        CancellationToken cancellationToken = default);
}
