using JassSpace.Api.Configuration;
using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Infra;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("auth")]
public sealed class AuthController(
    ILogger<AuthController> logger,
    IConfiguration configuration,
    IAuthService authService,
    IRateLimiterService rateLimiter)
    : BaseApiController
{
    [HttpPost("login")]
    [RateLimit("auth-login", Partition = RateLimitPartitionStrategy.IpAddress)]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<ProblemDetails>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ApiResponse<ProblemDetails>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Login attempt for {EmailOrUsername} with CorrelationId {CorrelationId}",
            request.EmailOrUsername,
            CorrelationId);

        try
        {
            var result = await authService.LoginAsync(request, CreateAuthRequestContext(), cancellationToken);

            switch (result.Status)
            {
                case AuthLoginStatus.Success:
                    if (!string.IsNullOrEmpty(result.Session!.Response.RefreshToken))
                    {
                        var cookieOptions = CreateSecureCookieOptions(result.Session.RefreshTokenExpiresAt - DateTimeOffset.UtcNow);
                        Response.Cookies.Append("refreshToken", result.Session.Response.RefreshToken, cookieOptions);
                    }

                    return OkEnvelope(result.Session.Response);
                case AuthLoginStatus.InvalidCredentials:
                case AuthLoginStatus.InactiveUser:
                case AuthLoginStatus.EmailNotVerified:
                    return UnauthorizedProblemEnvelope(result.ErrorMessage ?? "Unauthorized");
                default:
                    return ProblemEnvelope(
                        StatusCodes.Status500InternalServerError,
                        "Internal Server Error",
                        "An error occurred while processing your request");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during login for {EmailOrUsername}", request.EmailOrUsername);
            return ProblemEnvelope(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "An error occurred while processing your request");
        }
    }

    [HttpGet("availability/username")]
    [ProducesResponseType(typeof(ApiResponse<AvailabilityResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckUsernameAvailability([FromQuery] string? username, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await authService.CheckUsernameAvailabilityAsync(username, cancellationToken);
            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error checking username availability for {Username}", username);
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "Could not check username availability at this time.");
        }
    }

    [HttpGet("availability/email")]
    [ProducesResponseType(typeof(ApiResponse<AvailabilityResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckEmailAvailability([FromQuery] string? email, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await authService.CheckEmailAvailabilityAsync(email, cancellationToken);
            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error checking email availability for {Email}", email);
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "Could not check email availability at this time.");
        }
    }

    [HttpPost("register")]
    [RateLimit("auth-register", Partition = RateLimitPartitionStrategy.IpAddress)]
    [ProducesResponseType(typeof(ApiResponse<UserInfo>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Registration attempt for email {Email} with CorrelationId {CorrelationId}",
            request.Email,
            CorrelationId);

        try
        {
            var result = await authService.RegisterAsync(request, CreateAuthRequestContext(), cancellationToken);

            return result.Status switch
            {
                AuthRegisterStatus.Success => Created($"/auth/users/{result.User!.Id}", new ApiResponse<UserInfo>(result.User)),
                AuthRegisterStatus.EmailConflict => ConflictProblem(result.ErrorMessage ?? "A user with this email already exists"),
                AuthRegisterStatus.UsernameConflict => ConflictProblem(result.ErrorMessage ?? "This username is already taken"),
                AuthRegisterStatus.RegistrationDisabled or AuthRegisterStatus.InvalidUsername or AuthRegisterStatus.InvalidPassword
                    => BadRequestProblem(result.ErrorMessage ?? "Invalid registration request"),
                _ => Problem(
                    statusCode: StatusCodes.Status500InternalServerError,
                    title: "Internal Server Error",
                    detail: "An error occurred while processing your request")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during registration for email {Email}", request.Email);
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "An error occurred while processing your request");
        }
    }

    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Token refresh attempt with CorrelationId {CorrelationId}", CorrelationId);

        try
        {
            var refreshTokenValue = request.RefreshToken;

            if (string.IsNullOrEmpty(refreshTokenValue) && Request.Cookies.TryGetValue("refreshToken", out var cookieToken))
            {
                refreshTokenValue = cookieToken;
            }

            if (string.IsNullOrEmpty(refreshTokenValue))
            {
                return UnauthorizedProblem("Refresh token not found");
            }

            var result = await authService.RefreshTokenAsync(refreshTokenValue, CreateAuthRequestContext(), cancellationToken);
            if (result.Status == AuthRefreshStatus.Success)
            {
                if (!string.IsNullOrEmpty(result.Session!.Response.RefreshToken))
                {
                    var cookieOptions = CreateSecureCookieOptions(result.Session.RefreshTokenExpiresAt - DateTimeOffset.UtcNow);
                    Response.Cookies.Append("refreshToken", result.Session.Response.RefreshToken, cookieOptions);
                }

                return OkEnvelope(result.Session.Response);
            }

            return UnauthorizedProblem(result.ErrorMessage ?? "Invalid refresh token");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during token refresh");
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "An error occurred while processing your request");
        }
    }

    [HttpPost("logout")]
    [ProducesResponseType(typeof(ApiResponse<LogoutResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Logout attempt with CorrelationId {CorrelationId}", CorrelationId);

        try
        {
            var response = await authService.LogoutAsync(request.RefreshToken, TryGetCurrentSessionId(), cancellationToken);

            var deleteCookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = HttpContext.Request.IsHttps,
                SameSite = HttpContext.Request.IsHttps ? SameSiteMode.None : SameSiteMode.Lax,
                Path = "/"
            };

            var isDevelopment = configuration.GetValue("IsDevelopment", false) ||
                               !configuration.GetValue("IsProduction", false);
            if (isDevelopment && HttpContext.Request.Host.Host == "localhost")
            {
                deleteCookieOptions.Domain = "localhost";
            }

            Response.Cookies.Delete("refreshToken", deleteCookieOptions);
            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during logout");
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "An error occurred while processing your request");
        }
    }

    [HttpPost("verify-email")]
    [ProducesResponseType(typeof(ApiResponse<VerificationSentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Email verification attempt for {Email} with CorrelationId {CorrelationId}",
            request.Email,
            CorrelationId);

        try
        {
            var result = await authService.VerifyEmailAsync(request, cancellationToken);
            return result.Status == AuthVerifyEmailStatus.Success
                ? OkEnvelope(result.Response!)
                : BadRequestProblem(result.ErrorMessage ?? "Email verification failed");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during email verification for {Email}", request.Email);
            return Problem(
                statusCode: StatusCodes.Status500InternalServerError,
                title: "Internal Server Error",
                detail: "An error occurred while processing your request");
        }
    }

    [HttpGet("me")]
    [ProducesResponseType(typeof(ApiResponse<UserInfo>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(UserId) || !Guid.TryParse(UserId, out var userId))
        {
            return UnauthorizedProblem("Not authenticated");
        }

        var result = await authService.GetCurrentUserAsync(
            userId,
            TryGetCurrentSessionId(),
            CreateAuthRequestContext(),
            cancellationToken);

        return result.Status switch
        {
            AuthCurrentUserStatus.Success => OkEnvelope(result.User!),
            _ => UnauthorizedProblem(result.ErrorMessage ?? "User not found")
        };
    }

    [HttpGet("test-cookies")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public IActionResult TestCookies()
    {
        var isHttps = HttpContext.Request.IsHttps;
        var cookieValue = Request.Cookies.TryGetValue("refreshToken", out var cookie) ? cookie : "Not found";

        return Ok(new ApiResponse<object>(new
        {
            IsHttps = isHttps,
            RefreshTokenCookie = cookieValue != "Not found" ? "Present" : "Not found",
            AllCookies = Request.Cookies.Keys.ToArray(),
            UserAgent = Request.Headers.UserAgent.ToString(),
            Origin = Request.Headers.Origin.ToString()
        }));
    }

    [HttpPost("resend-verification")]
    [ProducesResponseType(typeof(ApiResponse<VerificationSentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Resend verification attempt for {Email} with CorrelationId {CorrelationId}", request.Email, CorrelationId);

        try
        {
            var throttleKey = request.Email.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(throttleKey))
            {
                return BadRequestProblem("A valid email is required to resend verification.");
            }

            var rateDecision = await rateLimiter.ShouldAllowAsync("auth-verification-resend", throttleKey, cancellationToken);
            ApplyRateLimitHeaders(rateDecision);
            if (!rateDecision.IsAllowed)
            {
                return TooManyRequestsProblem(
                    "Too many verification requests",
                    "Please wait before requesting another verification email.",
                    rateDecision);
            }

            var result = await authService.ResendVerificationAsync(request, cancellationToken);
            return result.Status == AuthResendVerificationStatus.Success
                ? Ok(new ApiResponse<VerificationSentResponse>(result.Response!))
                : BadRequestProblem(result.ErrorMessage ?? "Unable to resend verification");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during resend verification for {Email}", request.Email);
            return Problem("An error occurred while resending verification");
        }
    }

    [HttpPost("forgot-password")]
    [ProducesResponseType(typeof(ApiResponse<VerificationSentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Forgot password attempt for {Email} with CorrelationId {CorrelationId}",
            request.Email,
            CorrelationId);

        try
        {
            var throttleKey = request.Email.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(throttleKey))
            {
                return BadRequestProblem("A valid email is required to reset a password.");
            }

            var rateDecision = await rateLimiter.ShouldAllowAsync("auth-forgot-password", throttleKey, cancellationToken);
            ApplyRateLimitHeaders(rateDecision);
            if (!rateDecision.IsAllowed)
            {
                return TooManyRequestsProblem(
                    "Too many password reset requests",
                    "Please wait before requesting another password reset email.",
                    rateDecision);
            }

            var response = await authService.ForgotPasswordAsync(request, cancellationToken);
            return Ok(new ApiResponse<VerificationSentResponse>(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during forgot password for {Email}", request.Email);
            return Problem("An error occurred while processing password reset request");
        }
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Reset password attempt for {Email} with CorrelationId {CorrelationId}",
            request.Email,
            CorrelationId);

        try
        {
            var result = await authService.ResetPasswordAsync(request, cancellationToken);
            return result.Status == AuthResetPasswordStatus.Success
                ? Ok(new ApiResponse<object>(new { message = result.Message }))
                : BadRequestProblem(result.ErrorMessage ?? "Password reset failed");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during password reset for {Email}", request.Email);
            return Problem("An error occurred while resetting password");
        }
    }

    [HttpPost("set-password")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("SetPassword attempt for {Email} with CorrelationId {CorrelationId}", request.Email, CorrelationId);

        try
        {
            var result = await authService.SetPasswordAsync(request, TryGetCurrentSessionId(), cancellationToken);

            return result.Status switch
            {
                AuthSetPasswordStatus.Success => Ok(new ApiResponse<object>(new { message = result.Message })),
                AuthSetPasswordStatus.CurrentPasswordIncorrect => UnauthorizedProblem(result.ErrorMessage ?? "Current password is incorrect"),
                _ => BadRequestProblem(result.ErrorMessage ?? "Password update failed")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error during set password for {Email}", request.Email);
            return Problem("An error occurred while setting password");
        }
    }

    [HttpGet("github")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public IActionResult GitHubLogin()
    {
        logger.LogInformation("Initiating GitHub OAuth flow with CorrelationId {CorrelationId}", CorrelationId);

        var githubSettings = configuration.GetSection("OAuth:GitHub").Get<GitHubOAuthSettings>();
        if (githubSettings is null || string.IsNullOrEmpty(githubSettings.ClientId))
        {
            logger.LogError("GitHub OAuth settings not configured");
            return BadRequestProblem("GitHub OAuth not configured");
        }

        var state = Guid.NewGuid().ToString();
        const string scope = "read:user user:email";

        var authUrl = "https://github.com/login/oauth/authorize" +
                      $"?client_id={Uri.EscapeDataString(githubSettings.ClientId)}" +
                      $"&redirect_uri={Uri.EscapeDataString(githubSettings.RedirectUri)}" +
                      $"&scope={Uri.EscapeDataString(scope)}" +
                      $"&state={state}" +
                      "&allow_signup=true";

        return Ok(new ApiResponse<object>(new { AuthUrl = authUrl }));
    }

    [HttpGet("github/callback")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GitHubCallback(string code, string state, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Processing GitHub OAuth callback with CorrelationId {CorrelationId}", CorrelationId);

        try
        {
            if (string.IsNullOrEmpty(state) || string.IsNullOrEmpty(code))
            {
                return BadRequestProblem("Missing OAuth parameters");
            }

            var result = await authService.AuthenticateWithGitHubAsync(code, CreateAuthRequestContext(), cancellationToken);
            if (result.Status != AuthOAuthStatus.Success)
            {
                return BadRequestProblem(result.ErrorMessage ?? "GitHub authentication failed");
            }

            if (!string.IsNullOrEmpty(result.Session!.Response.RefreshToken))
            {
                var cookieOptions = CreateSecureCookieOptions(result.Session.RefreshTokenExpiresAt - DateTimeOffset.UtcNow);
                Response.Cookies.Append("refreshToken", result.Session.Response.RefreshToken, cookieOptions);
            }

            var frontendUrl = configuration.GetValue<string>("Frontend:BaseUrl", "http://localhost:3000");
            var redirectUrl =
                $"{frontendUrl}/account/oauth/callback?success=true&token={result.Session.Response.AccessToken}&expires={result.Session.Response.ExpiresAt:yyyy-MM-ddTHH:mm:ssZ}";

            return Redirect(redirectUrl);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing GitHub OAuth callback");
            var frontendUrl = configuration.GetValue<string>("Frontend:BaseUrl", "http://localhost:3000");
            return Redirect($"{frontendUrl}/account/oauth/callback?success=false&error=authentication_failed");
        }
    }

    [HttpGet("google")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    public IActionResult GoogleLogin()
    {
        logger.LogInformation("Initiating Google OAuth flow with CorrelationId {CorrelationId}", CorrelationId);

        var googleSettings = configuration.GetSection("OAuth:Google").Get<GoogleOAuthSettings>();
        if (googleSettings is null || string.IsNullOrEmpty(googleSettings.ClientId))
        {
            logger.LogError("Google OAuth settings not configured");
            return BadRequestProblem("Google OAuth not configured");
        }

        var state = Guid.NewGuid().ToString();
        var authUrl = "https://accounts.google.com/o/oauth2/v2/auth" +
                      $"?client_id={Uri.EscapeDataString(googleSettings.ClientId)}" +
                      $"&redirect_uri={Uri.EscapeDataString(googleSettings.RedirectUri)}" +
                      $"&response_type=code" +
                      $"&scope={Uri.EscapeDataString("openid profile email")}" +
                      $"&access_type=offline" +
                      $"&state={state}";

        return Ok(new ApiResponse<object>(new { AuthUrl = authUrl }));
    }

    [HttpGet("google/callback")]
    [ProducesResponseType(typeof(ApiResponse<AuthResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GoogleCallback(string code, string state, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Processing Google OAuth callback with CorrelationId {CorrelationId}", CorrelationId);

        try
        {
            if (string.IsNullOrEmpty(state) || string.IsNullOrEmpty(code))
            {
                return BadRequestProblem("Missing OAuth parameters");
            }

            var result = await authService.AuthenticateWithGoogleAsync(code, CreateAuthRequestContext(), cancellationToken);
            if (result.Status != AuthOAuthStatus.Success)
            {
                return BadRequestProblem(result.ErrorMessage ?? "Google authentication failed");
            }

            if (!string.IsNullOrEmpty(result.Session!.Response.RefreshToken))
            {
                var cookieOptions = CreateSecureCookieOptions(result.Session.RefreshTokenExpiresAt - DateTimeOffset.UtcNow);
                Response.Cookies.Append("refreshToken", result.Session.Response.RefreshToken, cookieOptions);
            }

            var frontendUrl = configuration.GetValue<string>("Frontend:BaseUrl", "http://localhost:3000");
            var redirectUrl =
                $"{frontendUrl}/account/oauth/callback?success=true&token={result.Session.Response.AccessToken}&expires={result.Session.Response.ExpiresAt:yyyy-MM-ddTHH:mm:ssZ}";

            return Redirect(redirectUrl);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing Google OAuth callback");
            var frontendUrl = configuration.GetValue<string>("Frontend:BaseUrl", "http://localhost:3000");
            return Redirect($"{frontendUrl}/account/oauth/callback?success=false&error=authentication_failed");
        }
    }

    private AuthRequestContext CreateAuthRequestContext()
    {
        return new AuthRequestContext(
            $"{Request.Scheme}://{Request.Host}",
            Request.Headers.UserAgent.ToString(),
            HttpContext.Connection.RemoteIpAddress);
    }

    private Guid? TryGetCurrentSessionId()
    {
        var sessionClaim = User.FindFirst("session_id")?.Value ?? User.FindFirst("sid")?.Value;
        return Guid.TryParse(sessionClaim, out var sessionId) ? sessionId : null;
    }

    private CookieOptions CreateSecureCookieOptions(TimeSpan? maxAge = null)
    {
        var isHttps = HttpContext.Request.IsHttps;
        var isDevelopment = configuration.GetValue("IsDevelopment", false) ||
                           !configuration.GetValue("IsProduction", false);

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = isHttps,
            SameSite = isHttps ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/",
            MaxAge = maxAge
        };

        if (isDevelopment && HttpContext.Request.Host.Host == "localhost")
        {
            cookieOptions.Domain = "localhost";
        }

        return cookieOptions;
    }
}
