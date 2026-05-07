using System.Text.RegularExpressions;
using Hangfire;
using Hangfire.States;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JassSpace.Services;

public sealed class AdminEmailService(
    JassSpaceDbContext dbContext,
    IEmailService emailService,
    IBackgroundJobClient backgroundJobClient,
    IUnsubscribeTokenService tokenService,
    IConfiguration configuration,
    ILogger<AdminEmailService> logger) : IAdminEmailService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IEmailService _emailService = emailService;
    private readonly IBackgroundJobClient _backgroundJobClient = backgroundJobClient;
    private readonly IUnsubscribeTokenService _tokenService = tokenService;
    private readonly ILogger<AdminEmailService> _logger = logger;
    private string AppUrl => configuration["AppUrl"] ?? "http://localhost:3001";
    private string ApiUrl => configuration["ApiUrl"] ?? "http://localhost:5001";

    private static readonly HashSet<string> AutoVars = new(StringComparer.OrdinalIgnoreCase)
    {
        "firstName", "lastName", "username", "email", "displayName"
    };

    public async Task<List<EmailTemplateResponse>> GetTemplatesAsync(CancellationToken cancellationToken = default)
    {
        var templates = await _dbContext.EmailTemplates
            .AsNoTracking()
            .OrderByDescending(t => t.UpdatedAt)
            .ToListAsync(cancellationToken);

        return templates.Select(ToResponse).ToList();
    }

    public async Task<EmailTemplateResponse?> GetTemplateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var template = await _dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        return template is null ? null : ToResponse(template);
    }

    public async Task<AdminEmailMutationResult> CreateTemplateAsync(
        CreateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return new AdminEmailMutationResult(AdminEmailMutationStatus.InvalidRequest, ErrorMessage: "Name is required.");
        if (string.IsNullOrWhiteSpace(request.Subject))
            return new AdminEmailMutationResult(AdminEmailMutationStatus.InvalidRequest, ErrorMessage: "Subject is required.");
        if (string.IsNullOrWhiteSpace(request.HtmlBody))
            return new AdminEmailMutationResult(AdminEmailMutationStatus.InvalidRequest, ErrorMessage: "HTML body is required.");

        var duplicate = await _dbContext.EmailTemplates
            .AnyAsync(t => t.Name == request.Name.Trim(), cancellationToken);
        if (duplicate)
            return new AdminEmailMutationResult(AdminEmailMutationStatus.DuplicateName, ErrorMessage: $"A template named '{request.Name.Trim()}' already exists.");

        var now = DateTimeOffset.UtcNow;
        var template = new EmailTemplate
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Subject = request.Subject.Trim(),
            HtmlBody = request.HtmlBody,
            TextBody = string.IsNullOrWhiteSpace(request.TextBody) ? null : request.TextBody,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.EmailTemplates.Add(template);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminEmailMutationResult(AdminEmailMutationStatus.Success, ToResponse(template));
    }

    public async Task<AdminEmailMutationResult> UpdateTemplateAsync(
        Guid id,
        UpdateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return new AdminEmailMutationResult(AdminEmailMutationStatus.InvalidRequest, ErrorMessage: "Name is required.");
        if (string.IsNullOrWhiteSpace(request.Subject))
            return new AdminEmailMutationResult(AdminEmailMutationStatus.InvalidRequest, ErrorMessage: "Subject is required.");
        if (string.IsNullOrWhiteSpace(request.HtmlBody))
            return new AdminEmailMutationResult(AdminEmailMutationStatus.InvalidRequest, ErrorMessage: "HTML body is required.");

        var template = await _dbContext.EmailTemplates
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
            return new AdminEmailMutationResult(AdminEmailMutationStatus.NotFound, ErrorMessage: $"No template found with ID '{id}'.");

        var duplicate = await _dbContext.EmailTemplates
            .AnyAsync(t => t.Name == request.Name.Trim() && t.Id != id, cancellationToken);
        if (duplicate)
            return new AdminEmailMutationResult(AdminEmailMutationStatus.DuplicateName, ErrorMessage: $"A template named '{request.Name.Trim()}' already exists.");

        template.Name = request.Name.Trim();
        template.Subject = request.Subject.Trim();
        template.HtmlBody = request.HtmlBody;
        template.TextBody = string.IsNullOrWhiteSpace(request.TextBody) ? null : request.TextBody;
        template.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminEmailMutationResult(AdminEmailMutationStatus.Success, ToResponse(template));
    }

    public async Task<AdminEmailMutationResult> DeleteTemplateAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var template = await _dbContext.EmailTemplates
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
            return new AdminEmailMutationResult(AdminEmailMutationStatus.NotFound, ErrorMessage: $"No template found with ID '{id}'.");

        _dbContext.EmailTemplates.Remove(template);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminEmailMutationResult(AdminEmailMutationStatus.Success);
    }

    public async Task<AdminEmailSendResult> TestSendAsync(
        Guid id,
        TestEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var template = await _dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
            return new AdminEmailSendResult(AdminEmailSendStatus.NotFound, ErrorMessage: $"No template found with ID '{id}'.");

        var userIds = request.TestRecipientUserIds.Distinct().ToList();
        if (userIds.Count == 0)
            return new AdminEmailSendResult(AdminEmailSendStatus.InvalidRecipients, ErrorMessage: "Provide at least one test recipient.");

        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id) && u.EmailVerified && u.IsActive && u.DeletedAt == null)
            .Select(u => new { u.Id, u.Email, u.FirstName, u.LastName, u.Username, u.DisplayName })
            .ToListAsync(cancellationToken);

        if (users.Count == 0)
            return new AdminEmailSendResult(AdminEmailSendStatus.InvalidRecipients, ErrorMessage: "None of the selected users are eligible recipients.");

        int sent = 0;
        foreach (var user in users)
        {
            var vars = new Dictionary<string, string>(request.Variables, StringComparer.OrdinalIgnoreCase)
            {
                ["firstName"]   = user.FirstName ?? "",
                ["lastName"]    = user.LastName ?? "",
                ["username"]    = user.Username,
                ["email"]       = user.Email,
                ["displayName"] = user.DisplayName ?? user.Username,
            };

            var subject = $"[TEST] {Substitute(template.Subject, vars)}";
            var unsubUrl = UnsubscribeUrl(user.Id);
            var body = AppendFooter(Substitute(template.HtmlBody, vars), unsubUrl);
            try
            {
                await _emailService.SendEmailAsync(user.Email, subject, body, isHtml: true);
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Test email failed to {Email}", user.Email);
            }
        }

        if (sent == 0)
            return new AdminEmailSendResult(AdminEmailSendStatus.SendFailed, ErrorMessage: "All test sends failed. Check SMTP configuration.");

        return new AdminEmailSendResult(AdminEmailSendStatus.Success, RecipientCount: sent);
    }

    public async Task<AdminEmailSendResult> BroadcastAsync(
        Guid id,
        BroadcastEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var template = await _dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (template is null)
            return new AdminEmailSendResult(AdminEmailSendStatus.NotFound, ErrorMessage: $"No template found with ID '{id}'.");

        var mode = request.Mode?.Trim().ToLowerInvariant();
        if (mode is not ("bcc" or "separate"))
            return new AdminEmailSendResult(AdminEmailSendStatus.InvalidRecipients, ErrorMessage: "Mode must be 'bcc' or 'separate'.");

        var users = await ResolveRecipientsAsync(request.Filter, cancellationToken);
        if (users.Count == 0)
            return new AdminEmailSendResult(AdminEmailSendStatus.InvalidRecipients, ErrorMessage: "No eligible recipients found for the given filter.");

        if (mode == "bcc")
        {
            var vars = BuildVarsWithAutoPlaceholders(request.Variables);
            var subject = Substitute(template.Subject, vars);
            // BCC: everyone gets the same body — link to preferences page instead of per-user token
            var prefsUrl = $"{AppUrl}/account/preferences";
            var body = AppendFooter(Substitute(template.HtmlBody, vars), prefsUrl);

            var emails = users.Select(u => u.Email).ToArray();
            try
            {
                await _emailService.SendEmailAsync(emails[0], subject, body, isHtml: true, bcc: emails[1..]);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "BCC broadcast failed for template {TemplateId}", id);
                return new AdminEmailSendResult(AdminEmailSendStatus.SendFailed, ErrorMessage: "Broadcast failed. Check SMTP configuration.");
            }

            return new AdminEmailSendResult(AdminEmailSendStatus.Success, RecipientCount: emails.Length);
        }
        else
        {
            // Separate mode — enqueue Hangfire job (footer injected per-user inside the job)
            var recipientIds = users.Select(u => u.Id).ToList();
            var jobId = _backgroundJobClient.Create(
                Hangfire.Common.Job.FromExpression<IEmailBroadcastJob>(
                    job => job.ExecuteAsync(id, request.Variables, recipientIds)),
                new EnqueuedState("emails"));

            _logger.LogInformation(
                "Enqueued email broadcast job {JobId} for template {TemplateId} to {Count} recipients",
                jobId, id, recipientIds.Count);

            return new AdminEmailSendResult(AdminEmailSendStatus.Success, RecipientCount: recipientIds.Count, JobId: jobId);
        }
    }

    private async Task<List<(Guid Id, string Email)>> ResolveRecipientsAsync(
        BroadcastRecipientFilter filter,
        CancellationToken cancellationToken)
    {
        // Exclude users who have opted out of broadcast emails
        var optedOutIds = await _dbContext.UserEmailPreferences
            .AsNoTracking()
            .Where(p => !p.ReceiveBroadcastEmails)
            .Select(p => p.UserId)
            .ToListAsync(cancellationToken);

        if (filter.UserIds is { Count: > 0 })
        {
            var rows = await _dbContext.Users
                .AsNoTracking()
                .Where(u => filter.UserIds.Contains(u.Id)
                         && u.EmailVerified && u.IsActive && u.DeletedAt == null
                         && !optedOutIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Email })
                .ToListAsync(cancellationToken);
            return rows.Select(u => (u.Id, u.Email)).ToList();
        }

        var query = _dbContext.Users
            .AsNoTracking()
            .Where(u => u.EmailVerified && u.IsActive && u.DeletedAt == null
                     && !optedOutIds.Contains(u.Id));

        if (filter.Roles is { Count: > 0 })
        {
            var roles = filter.Roles.Select(r => r.ToLowerInvariant()).ToList();
            query = query.Where(u => u.UserRoles.Any(ur => roles.Contains(ur.Role.Name)));
        }

        var results = await query
            .Select(u => new { u.Id, u.Email })
            .ToListAsync(cancellationToken);
        return results.Select(u => (u.Id, u.Email)).ToList();
    }

    private string UnsubscribeUrl(Guid userId)
        => $"{ApiUrl}/account/email-preferences/unsubscribe?token={_tokenService.GenerateToken(userId)}";

    public static string AppendFooter(string htmlBody, string unsubscribeUrl)
    {
        const string footer = """
            <div style="margin-top:40px;padding-top:20px;border-top:1px solid #2a2a2a;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              <p style="margin:0 0 6px;font-size:12px;color:#71717a;">JassSpace &bull; All rights reserved &copy; 2026</p>
              <p style="margin:0;font-size:12px;color:#71717a;">
                Don&apos;t want these? <a href="{unsubUrl}" style="color:#818cf8;text-decoration:none;">Unsubscribe</a>
              </p>
            </div>
            """;

        var footerHtml = footer.Replace("{unsubUrl}", unsubscribeUrl);

        // Inject before </body> if present, otherwise append
        var idx = htmlBody.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return idx >= 0
            ? htmlBody.Insert(idx, footerHtml)
            : htmlBody + footerHtml;
    }

    private static EmailTemplateResponse ToResponse(EmailTemplate t)
    {
        var variables = ExtractVariables(t.Subject, t.HtmlBody);
        return new EmailTemplateResponse(t.Id, t.Name, t.Subject, t.HtmlBody, t.TextBody, variables, t.CreatedAt, t.UpdatedAt);
    }

    public static List<string> ExtractVariables(string subject, string htmlBody)
        => Regex.Matches(subject + " " + htmlBody, @"\{\{([^}]+)\}\}")
            .Select(m => m.Groups[1].Value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    public static string Substitute(string template, Dictionary<string, string> vars)
        => Regex.Replace(template, @"\{\{([^}]+)\}\}", m =>
            vars.TryGetValue(m.Groups[1].Value.Trim(), out var v) ? v : m.Value);

    private static Dictionary<string, string> BuildVarsWithAutoPlaceholders(Dictionary<string, string>? manualVars)
    {
        var vars = manualVars is not null
            ? new Dictionary<string, string>(manualVars, StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        // Auto-vars not supplied get an italic placeholder for preview
        foreach (var autoVar in AutoVars)
        {
            if (!vars.ContainsKey(autoVar))
                vars[autoVar] = $"[{autoVar}]";
        }

        return vars;
    }

}
