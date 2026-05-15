using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using JassSpace.Infra.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JassSpace.Services;

public sealed class AuthService(
    ILogger<AuthService> logger,
    JassSpaceDbContext context,
    IConfiguration configuration,
    IJwtService jwtService,
    HttpClient httpClient,
    IEmailService emailService,
    IAzureBlobStorageService blobStorageService,
    IOptions<AzureBlobStorageSettings> blobSettings) : IAuthService
{
    private const string GitHubUserAgent = "JassSpaceApp/1.0";
    private const string ExternalAvatarUserAgent = "JassSpaceAvatarFetcher/1.0";
    private const string ProfilesBlobPrefix = "profiles/";

    private readonly ILogger<AuthService> _logger = logger;
    private readonly JassSpaceDbContext _context = context;
    private readonly IConfiguration _configuration = configuration;
    private readonly IJwtService _jwtService = jwtService;
    private readonly HttpClient _httpClient = httpClient;
    private readonly IEmailService _emailService = emailService;
    private readonly IAzureBlobStorageService _blobStorageService = blobStorageService;
    private readonly string _containerName = blobSettings.Value.ContainerName ?? string.Empty;

    public async Task<AuthLoginResult> LoginAsync(
        LoginRequest request,
        AuthRequestContext context,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(
                u => u.Email == request.EmailOrUsername || u.Username == request.EmailOrUsername,
                cancellationToken);

        if (user is null || user.DeletedAt.HasValue || !VerifyPassword(request.Password, user.PasswordHash))
        {
            return new AuthLoginResult(
                AuthLoginStatus.InvalidCredentials,
                ErrorMessage: "Invalid email/username or password");
        }

        if (!user.IsActive)
        {
            return new AuthLoginResult(
                AuthLoginStatus.InactiveUser,
                ErrorMessage: "Your account has been deactivated. Please contact support.");
        }

        if (!user.EmailVerified)
        {
            return new AuthLoginResult(
                AuthLoginStatus.EmailNotVerified,
                ErrorMessage: "Please verify your email before logging in");
        }

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AuthMethod = "EmailPassword",
            UserAgent = context.UserAgent ?? string.Empty,
            IpAddress = context.IpAddress ?? IPAddress.Loopback,
            CreatedAt = DateTimeOffset.UtcNow,
            LastSeenAt = DateTimeOffset.UtcNow
        };

        _context.Sessions.Add(session);

        var (refreshTokenValue, refreshToken) = CreateAndAddRefreshToken(user.Id, session.Id, request.RememberMe);
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var accessToken = _jwtService.GenerateToken(user, session.Id);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(ResolveJwtExpiryMinutes());
        var userInfo = BuildUserInfo(user, null, "EmailPassword", context.BaseUrl);
        var response = new AuthResponse(accessToken, refreshTokenValue, expiresAt, userInfo);

        return new AuthLoginResult(AuthLoginStatus.Success, new AuthSessionPayload(response, refreshToken.ExpiresAt));
    }

    public async Task<AvailabilityResponse> CheckUsernameAvailabilityAsync(
        string? username,
        CancellationToken cancellationToken = default)
    {
        var rawValue = username ?? string.Empty;
        var normalized = rawValue.Trim();

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return new AvailabilityResponse(string.Empty, false, false, "Username is required.");
        }

        if (normalized.Length < 3)
        {
            return new AvailabilityResponse(normalized, false, false, "Username must be at least 3 characters long.");
        }

        if (normalized.Length > 30)
        {
            return new AvailabilityResponse(normalized, false, false, "Username cannot be longer than 30 characters.");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(normalized, @"^[a-zA-Z0-9_-]+$"))
        {
            return new AvailabilityResponse(
                normalized,
                false,
                false,
                "Username can only contain letters, numbers, underscores, and hyphens.");
        }

        var normalizedLower = normalized.ToLowerInvariant();

        var existing = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedLower, cancellationToken);

        if (existing is null)
        {
            return new AvailabilityResponse(normalized, true, true);
        }

        if (existing.EmailVerified)
        {
            return new AvailabilityResponse(
                normalized,
                true,
                false,
                "This username is already taken.",
                "VerifiedUser");
        }

        return new AvailabilityResponse(
            normalized,
            true,
            true,
            "An unverified account currently holds this username. Continuing will replace it.",
            "PendingVerification");
    }

    public async Task<AvailabilityResponse> CheckEmailAvailabilityAsync(
        string? email,
        CancellationToken cancellationToken = default)
    {
        var rawValue = email ?? string.Empty;
        var normalized = rawValue.Trim();

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return new AvailabilityResponse(string.Empty, false, false, "Email address is required.");
        }

        if (normalized.Length > 256)
        {
            return new AvailabilityResponse(normalized, false, false, "Email address is too long.");
        }

        try
        {
            var mailAddress = new MailAddress(normalized);
            normalized = mailAddress.Address;
        }
        catch (FormatException)
        {
            return new AvailabilityResponse(normalized, false, false, "Please enter a valid email address.");
        }

        var normalizedLower = normalized.ToLowerInvariant();

        var existing = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedLower, cancellationToken);

        if (existing is null)
        {
            return new AvailabilityResponse(normalized, true, true);
        }

        if (existing.EmailVerified)
        {
            return new AvailabilityResponse(
                normalized,
                true,
                false,
                "An account with this email already exists.",
                "VerifiedUser");
        }

        return new AvailabilityResponse(
            normalized,
            true,
            true,
            "An unverified account exists for this email. Continuing will replace it.",
            "PendingVerification");
    }

    public async Task<AuthRegisterResult> RegisterAsync(
        RegisterRequest request,
        AuthRequestContext context,
        CancellationToken cancellationToken = default)
    {
        var signupDisabled = await _context.AppConfigs.AsNoTracking()
            .Where(ac => ac.Key == "SignupDisabled")
            .Select(ac => ac.Value == "true")
            .FirstOrDefaultAsync(cancellationToken);

        if (signupDisabled)
        {
            return new AuthRegisterResult(AuthRegisterStatus.RegistrationDisabled, ErrorMessage: "User registration is currently disabled");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return new AuthRegisterResult(AuthRegisterStatus.InvalidUsername, ErrorMessage: "Username is required");
        }

        if (request.Username.Length < 3)
        {
            return new AuthRegisterResult(AuthRegisterStatus.InvalidUsername, ErrorMessage: "Username must be at least 3 characters long");
        }

        if (request.Username.Length > 30)
        {
            return new AuthRegisterResult(AuthRegisterStatus.InvalidUsername, ErrorMessage: "Username cannot be longer than 30 characters");
        }

        if (!System.Text.RegularExpressions.Regex.IsMatch(request.Username, @"^[a-zA-Z0-9_-]+$"))
        {
            return new AuthRegisterResult(
                AuthRegisterStatus.InvalidUsername,
                ErrorMessage: "Username can only contain letters, numbers, underscores, and hyphens");
        }

        var minPasswordLength = await _context.AppConfigs.AsNoTracking()
            .Where(ac => ac.Key == "PasswordMinLength")
            .Select(ac => int.Parse(ac.Value))
            .FirstOrDefaultAsync(cancellationToken);

        if (request.Password.Length < minPasswordLength)
        {
            return new AuthRegisterResult(
                AuthRegisterStatus.InvalidPassword,
                ErrorMessage: $"Password must be at least {minPasswordLength} characters long");
        }

        var normalizedEmail = request.Email.Trim();
        var normalizedUsername = request.Username.Trim();
        var normalizedUsernameLower = normalizedUsername.ToLower();

        var emailOwner = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        var usernameOwner = await _context.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsernameLower, cancellationToken);

        if (emailOwner is not null && emailOwner.EmailVerified)
        {
            return new AuthRegisterResult(AuthRegisterStatus.EmailConflict, ErrorMessage: "A user with this email already exists");
        }

        if (usernameOwner is not null && usernameOwner.EmailVerified)
        {
            return new AuthRegisterResult(AuthRegisterStatus.UsernameConflict, ErrorMessage: "This username is already taken");
        }

        if (emailOwner is not null && !emailOwner.EmailVerified)
        {
            _context.Users.Remove(emailOwner);
            await _context.SaveChangesAsync(cancellationToken);
        }

        usernameOwner = await _context.Users
            .FirstOrDefaultAsync(u => u.Username.ToLower() == normalizedUsernameLower, cancellationToken);

        if (usernameOwner is not null && !usernameOwner.EmailVerified)
        {
            _context.Users.Remove(usernameOwner);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var usernameStillTaken = await _context.Users.AsNoTracking()
            .AnyAsync(u => u.Username.ToLower() == normalizedUsernameLower, cancellationToken);
        if (usernameStillTaken)
        {
            return new AuthRegisterResult(AuthRegisterStatus.UsernameConflict, ErrorMessage: "This username is already taken");
        }

        var userId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var user = new User
        {
            Id = userId,
            Email = normalizedEmail,
            PasswordHash = HashPassword(request.Password),
            EmailVerified = false,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Username = normalizedUsername,
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.Users.Add(user);

        var userRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.Name == "user", cancellationToken);

        if (userRole is not null)
        {
            var userRoleLink = new UserRole
            {
                UserId = userId,
                RoleId = userRole.Id
            };

            _context.UserRoles.Add(userRoleLink);
            user.UserRoles.Add(userRoleLink);
        }

        var verificationToken = GenerateVerificationToken();
        _context.OtpCodes.Add(new OtpCode
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            CodeHash = verificationToken,
            Purpose = "Signup",
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(24)
        });

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendVerificationEmailAsync(normalizedEmail, request.FirstName ?? "User", verificationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email for user {UserId}", userId);
        }

        var userInfo = BuildUserInfo(
            user,
            userRole is not null ? [userRole.Name] : [],
            null,
            context.BaseUrl);

        return new AuthRegisterResult(AuthRegisterStatus.Success, userInfo);
    }

    public async Task<AuthRefreshResult> RefreshTokenAsync(
        string refreshToken,
        AuthRequestContext context,
        CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(refreshToken);

        var persistedRefreshToken = await _context.RefreshTokens
            .Include(rt => rt.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Include(rt => rt.Session)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (persistedRefreshToken is null)
        {
            return new AuthRefreshResult(AuthRefreshStatus.InvalidToken, ErrorMessage: "Invalid refresh token");
        }

        if (persistedRefreshToken.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return new AuthRefreshResult(AuthRefreshStatus.ExpiredToken, ErrorMessage: "Refresh token has expired");
        }

        if (persistedRefreshToken.RevokedAt.HasValue)
        {
            return new AuthRefreshResult(AuthRefreshStatus.RevokedToken, ErrorMessage: "Refresh token has been revoked");
        }

        var (newRefreshTokenValue, newRefreshToken) = CreateAndAddRefreshToken(
            persistedRefreshToken.UserId,
            persistedRefreshToken.SessionId,
            rememberMe: false,
            familyId: persistedRefreshToken.FamilyId);

        persistedRefreshToken.RevokedAt = DateTimeOffset.UtcNow;
        persistedRefreshToken.ReplacedById = newRefreshToken.Id;
        persistedRefreshToken.Session.LastSeenAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var accessToken = _jwtService.GenerateToken(persistedRefreshToken.User, persistedRefreshToken.SessionId);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(ResolveJwtExpiryMinutes());
        var userInfo = BuildUserInfo(
            persistedRefreshToken.User,
            null,
            persistedRefreshToken.Session.AuthMethod,
            context.BaseUrl);

        var response = new AuthResponse(accessToken, newRefreshTokenValue, expiresAt, userInfo);
        return new AuthRefreshResult(AuthRefreshStatus.Success, new AuthSessionPayload(response, newRefreshToken.ExpiresAt));
    }

    public async Task<LogoutResponse> LogoutAsync(
        string? refreshToken,
        Guid? sessionId,
        CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(refreshToken))
        {
            var tokenHash = HashToken(refreshToken);
            var persistedRefreshToken = await _context.RefreshTokens
                .Include(rt => rt.Session)
                .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

            if (persistedRefreshToken is not null)
            {
                var now = DateTimeOffset.UtcNow;
                persistedRefreshToken.RevokedAt = now;
                persistedRefreshToken.Session.RevokedAt ??= now;

                if (persistedRefreshToken.SessionId != Guid.Empty)
                {
                    var siblingTokens = await _context.RefreshTokens
                        .Where(rt => rt.SessionId == persistedRefreshToken.SessionId && !rt.RevokedAt.HasValue)
                        .ToListAsync(cancellationToken);

                    foreach (var token in siblingTokens)
                    {
                        token.RevokedAt = now;
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else if (sessionId.HasValue)
        {
            var session = await _context.Sessions
                .Include(s => s.RefreshTokens)
                .FirstOrDefaultAsync(s => s.Id == sessionId.Value, cancellationToken);

            if (session is not null)
            {
                var now = DateTimeOffset.UtcNow;
                session.RevokedAt ??= now;

                foreach (var token in session.RefreshTokens.Where(r => !r.RevokedAt.HasValue))
                {
                    token.RevokedAt = now;
                }

                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        return new LogoutResponse("Logged out successfully", DateTimeOffset.UtcNow);
    }

    public async Task<AuthVerifyEmailResult> VerifyEmailAsync(
        VerifyEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            return new AuthVerifyEmailResult(AuthVerifyEmailStatus.MissingToken, ErrorMessage: "Verification token is required");
        }

        var normalizedToken = request.Token.Trim().ToUpperInvariant();

        var otpCode = await _context.OtpCodes
            .FirstOrDefaultAsync(
                oc => oc.Email == request.Email &&
                      oc.CodeHash == normalizedToken &&
                      oc.Purpose == "Signup",
                cancellationToken);

        if (otpCode is null)
        {
            return new AuthVerifyEmailResult(AuthVerifyEmailStatus.InvalidToken, ErrorMessage: "Invalid verification token");
        }

        if (otpCode.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return new AuthVerifyEmailResult(AuthVerifyEmailStatus.ExpiredToken, ErrorMessage: "Verification token has expired");
        }

        if (otpCode.ConsumedAt.HasValue)
        {
            return new AuthVerifyEmailResult(AuthVerifyEmailStatus.AlreadyUsed, ErrorMessage: "Verification token has already been used");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            return new AuthVerifyEmailResult(AuthVerifyEmailStatus.UserNotFound, ErrorMessage: "User not found");
        }

        user.EmailVerified = true;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        otpCode.ConsumedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendWelcomeEmailAsync(user.Email, user.FirstName ?? "User");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email for user {UserId}", user.Id);
        }

        return new AuthVerifyEmailResult(
            AuthVerifyEmailStatus.Success,
            new VerificationSentResponse("Email verified successfully", DateTimeOffset.UtcNow));
    }

    public async Task<AuthCurrentUserResult> GetCurrentUserAsync(
        Guid userId,
        Guid? sessionId,
        AuthRequestContext context,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user is null)
        {
            return new AuthCurrentUserResult(AuthCurrentUserStatus.UserNotFound, ErrorMessage: "User not found");
        }

        string? authMethod = null;

        if (sessionId.HasValue)
        {
            var session = await _context.Sessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId.Value && s.UserId == userId, cancellationToken);

            if (session is not null)
            {
                authMethod = session.AuthMethod;
            }
        }

        if (string.IsNullOrEmpty(authMethod))
        {
            var hasGoogleLogin = await _context.ExternalLogins
                .AsNoTracking()
                .AnyAsync(el => el.UserId == userId && el.Provider == "google", cancellationToken);

            authMethod = hasGoogleLogin ? "Google" : "EmailPassword";
        }

        var userInfo = BuildUserInfo(user, null, authMethod, context.BaseUrl);
        return new AuthCurrentUserResult(AuthCurrentUserStatus.Success, userInfo);
    }

    public async Task<AuthResendVerificationResult> ResendVerificationAsync(
        ResendVerificationRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            return new AuthResendVerificationResult(AuthResendVerificationStatus.UserNotFound, ErrorMessage: "User not found");
        }

        if (user.EmailVerified)
        {
            return new AuthResendVerificationResult(AuthResendVerificationStatus.AlreadyVerified, ErrorMessage: "Email is already verified");
        }

        var verificationToken = GenerateVerificationToken();
        _context.OtpCodes.Add(new OtpCode
        {
            Id = Guid.NewGuid(),
            Email = user.Email,
            CodeHash = verificationToken,
            Purpose = "Signup",
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15)
        });

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendVerificationEmailAsync(user.Email, user.FirstName ?? "User", verificationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resend verification email for user {UserId}", user.Id);
        }

        return new AuthResendVerificationResult(
            AuthResendVerificationStatus.Success,
            new VerificationSentResponse("Verification code sent to your email", DateTimeOffset.UtcNow));
    }

    public async Task<VerificationSentResponse> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            return new VerificationSentResponse(
                "If this email is registered, you will receive a password reset code",
                DateTimeOffset.UtcNow);
        }

        var resetToken = GenerateVerificationToken();
        _context.OtpCodes.Add(new OtpCode
        {
            Id = Guid.NewGuid(),
            Email = user.Email,
            CodeHash = resetToken,
            Purpose = "PasswordReset",
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(15)
        });

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendPasswordResetEmailAsync(user.Email, user.FirstName ?? "User", resetToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send password reset email for user {UserId}", user.Id);
        }

        return new VerificationSentResponse("Password reset code sent to your email", DateTimeOffset.UtcNow);
    }

    public async Task<AuthResetPasswordResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            return new AuthResetPasswordResult(AuthResetPasswordStatus.InvalidRequest, ErrorMessage: "Invalid reset request");
        }

        var otpCode = await _context.OtpCodes
            .FirstOrDefaultAsync(
                oc => oc.Email == user.Email &&
                      oc.CodeHash == request.Token.ToUpper() &&
                      oc.Purpose == "PasswordReset" &&
                      !oc.ConsumedAt.HasValue,
                cancellationToken);

        if (otpCode is null)
        {
            return new AuthResetPasswordResult(AuthResetPasswordStatus.InvalidToken, ErrorMessage: "Invalid or expired code");
        }

        if (otpCode.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return new AuthResetPasswordResult(AuthResetPasswordStatus.ExpiredToken, ErrorMessage: "Reset code has expired");
        }

        var minPasswordLength = ResolveConfiguredPasswordMinLength();
        if (request.NewPassword.Length < minPasswordLength)
        {
            return new AuthResetPasswordResult(
                AuthResetPasswordStatus.InvalidPassword,
                ErrorMessage: $"Password must be at least {minPasswordLength} characters long");
        }

        user.PasswordHash = HashPassword(request.NewPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var wasEmailUnverified = !user.EmailVerified;
        if (!user.EmailVerified)
        {
            user.EmailVerified = true;
        }

        otpCode.ConsumedAt = DateTimeOffset.UtcNow;

        var refreshTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && !rt.RevokedAt.HasValue)
            .ToListAsync(cancellationToken);

        foreach (var refreshToken in refreshTokens)
        {
            refreshToken.RevokedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (wasEmailUnverified)
        {
            try
            {
                await _emailService.SendWelcomeEmailAsync(user.Email, user.FirstName ?? "User");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send welcome email for user {UserId}", user.Id);
            }
        }

        return new AuthResetPasswordResult(AuthResetPasswordStatus.Success, "Password reset successful");
    }

    public async Task<AuthSetPasswordResult> SetPasswordAsync(
        SetPasswordRequest request,
        Guid? sessionId,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.ExternalLogins)
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            return new AuthSetPasswordResult(AuthSetPasswordStatus.UserNotFound, ErrorMessage: "User not found");
        }

        string? currentAuthMethod = null;
        if (sessionId.HasValue)
        {
            var session = await _context.Sessions
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.Id == sessionId.Value && s.UserId == user.Id, cancellationToken);

            if (session is not null)
            {
                currentAuthMethod = session.AuthMethod;
            }
        }

        var isOAuthLogin = currentAuthMethod is not null && currentAuthMethod != "EmailPassword";
        var hasExistingPassword = HasUsablePassword(user.PasswordHash);

        if (!isOAuthLogin && hasExistingPassword)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword))
            {
                return new AuthSetPasswordResult(AuthSetPasswordStatus.CurrentPasswordRequired, ErrorMessage: "Current password is required");
            }

            if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return new AuthSetPasswordResult(AuthSetPasswordStatus.CurrentPasswordIncorrect, ErrorMessage: "Current password is incorrect");
            }
        }

        var minPasswordLength = ResolveConfiguredPasswordMinLength();
        if (request.NewPassword.Length < minPasswordLength)
        {
            return new AuthSetPasswordResult(
                AuthSetPasswordStatus.InvalidPassword,
                ErrorMessage: $"Password must be at least {minPasswordLength} characters long");
        }

        user.PasswordHash = HashPassword(request.NewPassword);
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var refreshTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && !rt.RevokedAt.HasValue)
            .ToListAsync(cancellationToken);

        foreach (var refreshToken in refreshTokens)
        {
            refreshToken.RevokedAt = DateTimeOffset.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return new AuthSetPasswordResult(AuthSetPasswordStatus.Success, "Password updated successfully");
    }

    public async Task<AuthOAuthResult> AuthenticateWithGitHubAsync(
        string code,
        AuthRequestContext context,
        CancellationToken cancellationToken = default)
    {
        var clientId = _configuration["OAuth:GitHub:ClientId"];
        var clientSecret = _configuration["OAuth:GitHub:ClientSecret"];
        var redirectUri = _configuration["OAuth:GitHub:RedirectUri"];

        if (string.IsNullOrWhiteSpace(clientId) ||
            string.IsNullOrWhiteSpace(clientSecret) ||
            string.IsNullOrWhiteSpace(redirectUri))
        {
            return new AuthOAuthResult(AuthOAuthStatus.OAuthNotConfigured, ErrorMessage: "GitHub OAuth not configured");
        }

        var tokenResponse = await ExchangeCodeForGitHubToken(code, clientId, clientSecret, redirectUri, cancellationToken);
        if (tokenResponse is null || string.IsNullOrEmpty(tokenResponse.AccessToken))
        {
            return new AuthOAuthResult(AuthOAuthStatus.TokenExchangeFailed, ErrorMessage: "Failed to exchange code for token");
        }

        var githubUser = await GetGitHubUserDetails(tokenResponse.AccessToken, cancellationToken);
        if (githubUser is null)
        {
            return new AuthOAuthResult(
                AuthOAuthStatus.UserInfoUnavailable,
                ErrorMessage: "Unable to retrieve required email information from GitHub. Please ensure your account has a verified email address.");
        }

        var user = await FindOrCreateGitHubUser(githubUser, context.BaseUrl, cancellationToken);
        var session = await GenerateOAuthSessionPayloadAsync(user, "GitHub", context, cancellationToken);
        return new AuthOAuthResult(AuthOAuthStatus.Success, session);
    }

    public async Task<AuthOAuthResult> AuthenticateWithGoogleAsync(
        string code,
        AuthRequestContext context,
        CancellationToken cancellationToken = default)
    {
        var clientId = _configuration["OAuth:Google:ClientId"];
        var clientSecret = _configuration["OAuth:Google:ClientSecret"];
        var redirectUri = _configuration["OAuth:Google:RedirectUri"];

        if (string.IsNullOrWhiteSpace(clientId) ||
            string.IsNullOrWhiteSpace(clientSecret) ||
            string.IsNullOrWhiteSpace(redirectUri))
        {
            return new AuthOAuthResult(AuthOAuthStatus.OAuthNotConfigured, ErrorMessage: "Google OAuth not configured");
        }

        var tokenResponse = await ExchangeCodeForGoogleToken(code, clientId, clientSecret, redirectUri, cancellationToken);
        if (tokenResponse is null)
        {
            return new AuthOAuthResult(AuthOAuthStatus.TokenExchangeFailed, ErrorMessage: "Failed to exchange code for token");
        }

        var googleUser = await GetGoogleUserInfo(tokenResponse.AccessToken, cancellationToken);
        if (googleUser is null)
        {
            return new AuthOAuthResult(AuthOAuthStatus.UserInfoUnavailable, ErrorMessage: "Failed to get user info from Google");
        }

        var user = await FindOrCreateGoogleUser(googleUser, context.BaseUrl, cancellationToken);
        var session = await GenerateOAuthSessionPayloadAsync(user, "Google", context, cancellationToken);
        return new AuthOAuthResult(AuthOAuthStatus.Success, session);
    }

    private async Task<AuthSessionPayload> GenerateOAuthSessionPayloadAsync(
        User user,
        string authMethod,
        AuthRequestContext context,
        CancellationToken cancellationToken)
    {
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AuthMethod = authMethod,
            UserAgent = context.UserAgent ?? string.Empty,
            IpAddress = context.IpAddress ?? IPAddress.Loopback,
            CreatedAt = DateTimeOffset.UtcNow,
            LastSeenAt = DateTimeOffset.UtcNow
        };

        _context.Sessions.Add(session);
        var (refreshTokenValue, refreshToken) = CreateAndAddRefreshToken(user.Id, session.Id, explicitDays: 7);
        await _context.SaveChangesAsync(cancellationToken);

        var accessToken = _jwtService.GenerateToken(user, session.Id);
        var userInfo = BuildUserInfo(user, null, authMethod, context.BaseUrl);
        var authResponse = new AuthResponse(
            accessToken,
            refreshTokenValue,
            DateTimeOffset.UtcNow.AddMinutes(15),
            userInfo);

        return new AuthSessionPayload(authResponse, refreshToken.ExpiresAt);
    }

    private static string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);

    private static bool VerifyPassword(string password, string hash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch
        {
            return false;
        }
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(hashedBytes);
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private (string TokenValue, RefreshToken RefreshToken) CreateAndAddRefreshToken(
        Guid userId,
        Guid sessionId,
        bool rememberMe = false,
        Guid? familyId = null,
        int? explicitDays = null)
    {
        var now = DateTimeOffset.UtcNow;
        var defaultDays = ResolveConfiguredInt("Auth:RefreshTokenDays", 14);
        var rememberDays = ResolveConfiguredInt("Auth:RefreshTokenRememberDays", 60);
        var days = explicitDays ?? (rememberMe ? rememberDays : defaultDays);

        var tokenValue = GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionId = sessionId,
            TokenHash = HashToken(tokenValue),
            FamilyId = familyId ?? Guid.NewGuid(),
            ExpiresAt = now.AddDays(days),
            IssuedAt = now
        };

        _context.RefreshTokens.Add(refreshToken);
        return (tokenValue, refreshToken);
    }

    private static string GenerateVerificationToken()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes)
            .Replace("+", string.Empty, StringComparison.Ordinal)
            .Replace("/", string.Empty, StringComparison.Ordinal)
            .Replace("=", string.Empty, StringComparison.Ordinal)[..8]
            .ToUpperInvariant();
    }

    private async Task<GitHubTokenResponse?> ExchangeCodeForGitHubToken(
        string code,
        string clientId,
        string clientSecret,
        string redirectUri,
        CancellationToken cancellationToken)
    {
        var tokenRequest = new HttpRequestMessage(HttpMethod.Post, "https://github.com/login/oauth/access_token")
        {
            Content = new FormUrlEncodedContent([
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("redirect_uri", redirectUri)
            ])
        };

        tokenRequest.Headers.Accept.Clear();
        tokenRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        tokenRequest.Headers.UserAgent.ParseAdd(GitHubUserAgent);

        var response = await _httpClient.SendAsync(tokenRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to exchange code for GitHub token. Status: {StatusCode}", response.StatusCode);
            return null;
        }

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<GitHubTokenResponse>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
    }

    private async Task<GitHubUserDetails?> GetGitHubUserDetails(string accessToken, CancellationToken cancellationToken)
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        var userRequest = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user");
        userRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        userRequest.Headers.UserAgent.ParseAdd(GitHubUserAgent);
        userRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        var userResponse = await _httpClient.SendAsync(userRequest, cancellationToken);
        if (!userResponse.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to get GitHub user info. Status: {StatusCode}", userResponse.StatusCode);
            return null;
        }

        var userContent = await userResponse.Content.ReadAsStringAsync(cancellationToken);
        var userInfo = JsonSerializer.Deserialize<GitHubUserInfo>(userContent, options);
        if (userInfo is null)
        {
            return null;
        }

        var email = userInfo.Email;
        var emailVerified = false;

        if (string.IsNullOrEmpty(email))
        {
            var emails = await GetGitHubEmails(accessToken, cancellationToken);
            var primaryEmail = emails?
                .OrderByDescending(e => e.Primary)
                .ThenByDescending(e => e.Verified)
                .FirstOrDefault();

            if (primaryEmail is not null)
            {
                email = primaryEmail.Email;
                emailVerified = primaryEmail.Verified;
            }
        }
        else
        {
            emailVerified = true;
        }

        if (string.IsNullOrEmpty(email))
        {
            _logger.LogWarning("GitHub user {UserId} does not have an accessible email address", userInfo.Id);
            return null;
        }

        return new GitHubUserDetails(
            userInfo.Id.ToString(),
            userInfo.Login,
            userInfo.Name,
            email,
            emailVerified,
            userInfo.AvatarUrl);
    }

    private async Task<GitHubEmailInfo[]?> GetGitHubEmails(string accessToken, CancellationToken cancellationToken)
    {
        var emailRequest = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
        emailRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        emailRequest.Headers.UserAgent.ParseAdd(GitHubUserAgent);
        emailRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        var emailResponse = await _httpClient.SendAsync(emailRequest, cancellationToken);
        if (!emailResponse.IsSuccessStatusCode)
        {
            _logger.LogWarning("Failed to load GitHub account emails. Status: {StatusCode}", emailResponse.StatusCode);
            return null;
        }

        var content = await emailResponse.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<GitHubEmailInfo[]>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
    }

    private async Task<User> FindOrCreateGitHubUser(
        GitHubUserDetails githubUser,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        var existingExternalLogin = await _context.ExternalLogins
            .Include(el => el.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Include(el => el.User)
            .FirstOrDefaultAsync(
                el => el.Provider == "github" && el.ProviderUserId == githubUser.Id,
                cancellationToken);

        if (existingExternalLogin is not null)
        {
            var saveRequired = false;

            if (!existingExternalLogin.User.EmailVerified && githubUser.EmailVerified)
            {
                existingExternalLogin.User.EmailVerified = true;
                existingExternalLogin.User.UpdatedAt = DateTimeOffset.UtcNow;
                saveRequired = true;
            }

            if (await TryUpdateAvatarFromProviderAsync(existingExternalLogin.User, githubUser.AvatarUrl, "github", baseUrl, cancellationToken))
            {
                saveRequired = true;
            }

            if (saveRequired)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            return existingExternalLogin.User;
        }

        var existingUser = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == githubUser.Email, cancellationToken);

        if (existingUser is not null)
        {
            _context.ExternalLogins.Add(new ExternalLogin
            {
                Id = Guid.NewGuid(),
                UserId = existingUser.Id,
                Provider = "github",
                ProviderUserId = githubUser.Id,
                ProviderEmail = githubUser.Email,
                LinkedAt = DateTimeOffset.UtcNow
            });

            if (!existingUser.EmailVerified && githubUser.EmailVerified)
            {
                existingUser.EmailVerified = true;
                existingUser.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await TryUpdateAvatarFromProviderAsync(existingUser, githubUser.AvatarUrl, "github", baseUrl, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return existingUser;
        }

        var now = DateTimeOffset.UtcNow;
        var firstName = string.Empty;
        var lastName = string.Empty;
        var fullName = (githubUser.Name ?? string.Empty).Trim();

        if (!string.IsNullOrEmpty(fullName))
        {
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            switch (parts.Length)
            {
                case 1:
                    firstName = parts[0];
                    break;
                case >= 2:
                    firstName = parts[0];
                    lastName = parts[^1];
                    break;
            }
        }

        if (string.IsNullOrWhiteSpace(firstName))
        {
            firstName = githubUser.Login;
        }

        var displayName = !string.IsNullOrWhiteSpace(fullName) ? fullName : githubUser.Login;

        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = githubUser.Email,
            EmailVerified = githubUser.EmailVerified,
            PasswordHash = GenerateRandomHash(),
            FirstName = firstName,
            LastName = lastName,
            Username = await GenerateUniqueUsername(githubUser.Login, cancellationToken),
            DisplayName = displayName,
            AvatarUrl = githubUser.AvatarUrl,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var cachedAvatar = await CacheExternalAvatarAsync(newUser.Id, "github", githubUser.AvatarUrl, baseUrl, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cachedAvatar))
        {
            newUser.AvatarUrl = cachedAvatar;
        }

        _context.Users.Add(newUser);
        _context.ExternalLogins.Add(new ExternalLogin
        {
            Id = Guid.NewGuid(),
            UserId = newUser.Id,
            Provider = "github",
            ProviderUserId = githubUser.Id,
            ProviderEmail = githubUser.Email,
            LinkedAt = now
        });

        var defaultRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "user", cancellationToken);
        if (defaultRole is not null)
        {
            var userRoleLink = new UserRole
            {
                UserId = newUser.Id,
                RoleId = defaultRole.Id
            };

            _context.UserRoles.Add(userRoleLink);
            newUser.UserRoles.Add(userRoleLink);
        }

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendWelcomeEmailAsync(newUser.Email, newUser.FirstName ?? newUser.Username);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email to new GitHub OAuth user {UserId}", newUser.Id);
        }

        return newUser;
    }

    private sealed record GitHubUserDetails(
        string Id,
        string Login,
        string? Name,
        string Email,
        bool EmailVerified,
        string? AvatarUrl);

    private async Task<GoogleTokenResponse?> ExchangeCodeForGoogleToken(
        string code,
        string clientId,
        string clientSecret,
        string redirectUri,
        CancellationToken cancellationToken)
    {
        var tokenRequest = new FormUrlEncodedContent([
            new KeyValuePair<string, string>("client_id", clientId),
            new KeyValuePair<string, string>("client_secret", clientSecret),
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("grant_type", "authorization_code"),
            new KeyValuePair<string, string>("redirect_uri", redirectUri)
        ]);

        var response = await _httpClient.PostAsync("https://oauth2.googleapis.com/token", tokenRequest, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to exchange code for Google token. Status: {StatusCode}", response.StatusCode);
            return null;
        }

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<GoogleTokenResponse>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
    }

    private async Task<GoogleUserInfo?> GetGoogleUserInfo(string accessToken, CancellationToken cancellationToken)
    {
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");

        var response = await _httpClient.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo", cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Failed to get Google user info. Status: {StatusCode}", response.StatusCode);
            return null;
        }

        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        return JsonSerializer.Deserialize<GoogleUserInfo>(
            content,
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    private async Task<User> FindOrCreateGoogleUser(
        GoogleUserInfo googleUser,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        var existingExternalLogin = await _context.ExternalLogins
            .Include(el => el.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Include(el => el.User)
            .FirstOrDefaultAsync(
                el => el.Provider == "google" && el.ProviderUserId == googleUser.Id,
                cancellationToken);

        if (existingExternalLogin is not null)
        {
            var saveRequired = false;

            if (!existingExternalLogin.User.EmailVerified)
            {
                existingExternalLogin.User.EmailVerified = true;
                existingExternalLogin.User.UpdatedAt = DateTimeOffset.UtcNow;
                saveRequired = true;
            }

            if (await TryUpdateAvatarFromProviderAsync(existingExternalLogin.User, googleUser.Picture, "google", baseUrl, cancellationToken))
            {
                saveRequired = true;
            }

            if (saveRequired)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }

            return existingExternalLogin.User;
        }

        var existingUser = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Email == googleUser.Email, cancellationToken);

        if (existingUser is not null)
        {
            _context.ExternalLogins.Add(new ExternalLogin
            {
                Id = Guid.NewGuid(),
                UserId = existingUser.Id,
                Provider = "google",
                ProviderUserId = googleUser.Id,
                ProviderEmail = googleUser.Email,
                LinkedAt = DateTimeOffset.UtcNow
            });

            if (!existingUser.EmailVerified)
            {
                existingUser.EmailVerified = true;
                existingUser.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await TryUpdateAvatarFromProviderAsync(existingUser, googleUser.Picture, "google", baseUrl, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
            return existingUser;
        }

        var parsedFirstName = googleUser.GivenName;
        var parsedLastName = googleUser.FamilyName;
        var fullName = googleUser.Name.Trim();

        if (string.IsNullOrEmpty(parsedFirstName) && !string.IsNullOrEmpty(fullName))
        {
            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            switch (parts.Length)
            {
                case 1:
                    parsedFirstName = parts[0];
                    parsedLastName = string.Empty;
                    break;
                case >= 2:
                    parsedFirstName = parts[0];
                    parsedLastName = parts[^1];
                    break;
            }
        }

        var now = DateTimeOffset.UtcNow;
        var newUser = new User
        {
            Id = Guid.NewGuid(),
            Email = googleUser.Email,
            EmailVerified = true,
            PasswordHash = GenerateRandomHash(),
            FirstName = parsedFirstName,
            LastName = parsedLastName,
            Username = await GenerateUniqueUsername(
                fullName != string.Empty ? fullName : googleUser.Email.Split('@')[0],
                cancellationToken),
            DisplayName = string.IsNullOrEmpty(parsedFirstName) ? fullName : parsedFirstName,
            AvatarUrl = googleUser.Picture,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var cachedAvatar = await CacheExternalAvatarAsync(newUser.Id, "google", googleUser.Picture, baseUrl, cancellationToken);
        if (!string.IsNullOrWhiteSpace(cachedAvatar))
        {
            newUser.AvatarUrl = cachedAvatar;
        }

        _context.Users.Add(newUser);
        _context.ExternalLogins.Add(new ExternalLogin
        {
            Id = Guid.NewGuid(),
            UserId = newUser.Id,
            Provider = "google",
            ProviderUserId = googleUser.Id,
            ProviderEmail = googleUser.Email,
            LinkedAt = now
        });

        var defaultRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "user", cancellationToken);
        if (defaultRole is not null)
        {
            var userRoleLink = new UserRole
            {
                UserId = newUser.Id,
                RoleId = defaultRole.Id
            };

            _context.UserRoles.Add(userRoleLink);
            newUser.UserRoles.Add(userRoleLink);
        }

        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendWelcomeEmailAsync(newUser.Email, newUser.FirstName ?? "User");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send welcome email to new Google OAuth user {UserId}", newUser.Id);
        }

        return newUser;
    }

    private async Task<bool> TryUpdateAvatarFromProviderAsync(
        User user,
        string? externalUrl,
        string provider,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        if (!ShouldReplaceAvatar(user.AvatarUrl, provider) || string.IsNullOrWhiteSpace(externalUrl))
        {
            return false;
        }

        var cachedUrl = await CacheExternalAvatarAsync(user.Id, provider, externalUrl, baseUrl, cancellationToken);
        if (string.IsNullOrWhiteSpace(cachedUrl) ||
            string.Equals(user.AvatarUrl, cachedUrl, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        user.AvatarUrl = cachedUrl;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        return true;
    }

    private async Task<string?> CacheExternalAvatarAsync(
        Guid userId,
        string provider,
        string? externalUrl,
        string baseUrl,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(externalUrl))
        {
            return null;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, externalUrl);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("image/*"));
            request.Headers.UserAgent.ParseAdd(ExternalAvatarUserAgent);

            using var response = await _httpClient.SendAsync(
                request,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to download {Provider} avatar for user {UserId}. StatusCode {StatusCode}",
                    provider,
                    userId,
                    response.StatusCode);
                return null;
            }

            var headerContentType = response.Content.Headers.ContentType?.MediaType;
            var resolvedContentType = ResolveContentType(headerContentType, externalUrl);

            await using var sourceStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var uploadResult = await _blobStorageService.UploadImageAsync(
                sourceStream,
                $"{provider}-avatar{GetExtensionFromContentType(resolvedContentType)}",
                resolvedContentType,
                EnsureProfilesBlobName($"{userId:N}-avatar"),
                cancellationToken);

            return BuildMediaUrl(baseUrl, StripProfilesPrefix(uploadResult.BlobName));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to cache {Provider} avatar for user {UserId}", provider, userId);
            return null;
        }
    }

    private static bool ShouldReplaceAvatar(string? currentAvatarUrl, string provider)
    {
        if (string.IsNullOrWhiteSpace(currentAvatarUrl))
        {
            return true;
        }

        return provider.ToLowerInvariant() switch
        {
            "google" => currentAvatarUrl.Contains("googleusercontent.com", StringComparison.OrdinalIgnoreCase),
            "github" => currentAvatarUrl.Contains("githubusercontent.com", StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }

    private static string ResolveContentType(string? headerContentType, string sourceUrl)
    {
        if (!string.IsNullOrWhiteSpace(headerContentType))
        {
            return headerContentType;
        }

        var extension = ExtractExtension(sourceUrl);
        return extension switch
        {
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".bmp" => "image/bmp",
            ".tiff" => "image/tiff",
            ".svg" => "image/svg+xml",
            _ => "image/jpeg"
        };
    }

    private static string GetExtensionFromContentType(string contentType)
    {
        return contentType.ToLowerInvariant() switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png" => ".png",
            "image/gif" => ".gif",
            "image/webp" => ".webp",
            "image/bmp" => ".bmp",
            "image/tiff" => ".tiff",
            "image/svg+xml" => ".svg",
            _ => ".jpg"
        };
    }

    private static string ExtractExtension(string sourceUrl)
    {
        if (Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri))
        {
            var ext = Path.GetExtension(uri.AbsolutePath);
            if (!string.IsNullOrWhiteSpace(ext))
            {
                return ext.ToLowerInvariant();
            }
        }

        return string.Empty;
    }

    private static string EnsureProfilesBlobName(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(ProfilesBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized
            : $"{ProfilesBlobPrefix}{normalized}";
    }

    private static string StripProfilesPrefix(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(ProfilesBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized[ProfilesBlobPrefix.Length..]
            : normalized;
    }

    private UserInfo BuildUserInfo(
        User user,
        IEnumerable<string>? rolesOverride,
        string? authMethod,
        string baseUrl)
    {
        var username = string.IsNullOrWhiteSpace(user.Username)
            ? $"user{user.Id.ToString().Split('-')[0]}"
            : user.Username;

        var firstName = user.FirstName ?? string.Empty;
        var lastName = user.LastName ?? string.Empty;

        var roles = rolesOverride?.ToArray() ?? user.UserRoles.Select(ur => ur.Role.Name).ToArray();

        return new UserInfo(
            user.Id,
            user.Email,
            user.EmailVerified,
            username,
            firstName,
            lastName,
            user.DisplayName,
            user.Bio,
            ToMediaUrl(baseUrl, user.AvatarUrl, _containerName),
            ToMediaUrl(baseUrl, user.CoverUrl, _containerName),
            user.Timezone,
            user.Locale,
            user.CreatedAt,
            roles,
            authMethod);
    }

    private async Task<string> GenerateUniqueUsername(string baseName, CancellationToken cancellationToken)
    {
        var cleanName = baseName.Replace(" ", string.Empty).Replace(".", string.Empty).ToLowerInvariant();
        if (string.IsNullOrEmpty(cleanName))
        {
            cleanName = "user";
        }

        var username = cleanName;
        var counter = 1;

        while (await _context.Users.AnyAsync(u => u.Username == username, cancellationToken))
        {
            username = $"{cleanName}{counter}";
            counter++;
        }

        return username;
    }

    private static string GenerateRandomHash()
    {
        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private static bool HasUsablePassword(string? passwordHash)
        => !string.IsNullOrEmpty(passwordHash) &&
           passwordHash.StartsWith("$2", StringComparison.Ordinal);

    private int ResolveJwtExpiryMinutes()
    {
        var expiryMinutes = ResolveConfiguredInt("JWT:ExpiryMinutes", 15);
        if (expiryMinutes <= 0 || expiryMinutes > 24 * 60)
        {
            _logger.LogError("Invalid JWT:ExpiryMinutes value {Configured}. Falling back to 15.", expiryMinutes);
            return 15;
        }

        return expiryMinutes;
    }

    private int ResolveConfiguredPasswordMinLength()
        => ResolveConfiguredInt("Auth:MinPasswordLength", 8);

    private int ResolveConfiguredInt(string key, int fallback)
        => int.TryParse(_configuration[key], out var value) ? value : fallback;

    private static string BuildMediaUrl(string baseUrl, string blobName)
        => $"{baseUrl.TrimEnd('/')}/media/{blobName.TrimStart('/')}";

    private static string? ToMediaUrl(string baseUrl, string? value, string? containerName)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        var trimmed = value.Trim();

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            if (absolute.AbsolutePath.StartsWith("/media/", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            if (TryResolveBlobNameFromUrl(trimmed, containerName, out var blobName))
            {
                return BuildMediaUrl(baseUrl, blobName);
            }

            return trimmed;
        }

        if (trimmed.StartsWith("/media/", StringComparison.OrdinalIgnoreCase))
        {
            return $"{baseUrl.TrimEnd('/')}{trimmed}";
        }

        return BuildMediaUrl(baseUrl, trimmed.TrimStart('/'));
    }

    private static bool TryResolveBlobNameFromUrl(string blobUrl, string? containerName, out string blobName)
    {
        blobName = string.Empty;

        if (!Uri.TryCreate(blobUrl, UriKind.Absolute, out var uri))
        {
            return false;
        }

        var pathSegments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments.Length == 0)
        {
            return false;
        }

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
        {
            return false;
        }

        if (!containerFound && !string.IsNullOrWhiteSpace(container))
        {
            blobStartIndex = pathSegments.Length > 1 ? pathSegments.Length - 1 : 0;
        }

        var builder = new StringBuilder();
        for (var i = blobStartIndex; i < pathSegments.Length; i++)
        {
            if (builder.Length > 0)
            {
                builder.Append('/');
            }

            builder.Append(Uri.UnescapeDataString(pathSegments[i]));
        }

        var candidate = builder.ToString();
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return false;
        }

        blobName = candidate;
        return true;
    }
}
