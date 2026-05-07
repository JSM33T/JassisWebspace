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
using Microsoft.Extensions.Logging;

namespace JassSpace.Services;

public sealed class AdminEmailService(
    JassSpaceDbContext dbContext,
    IEmailService emailService,
    IBackgroundJobClient backgroundJobClient,
    ILogger<AdminEmailService> logger) : IAdminEmailService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IEmailService _emailService = emailService;
    private readonly IBackgroundJobClient _backgroundJobClient = backgroundJobClient;
    private readonly ILogger<AdminEmailService> _logger = logger;

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
            var body = Substitute(template.HtmlBody, vars);
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
            var body = Substitute(template.HtmlBody, vars);

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
            // Separate mode — enqueue Hangfire job
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
        // Explicit user IDs override everything
        if (filter.UserIds is { Count: > 0 })
        {
            var rows = await _dbContext.Users
                .AsNoTracking()
                .Where(u => filter.UserIds.Contains(u.Id) && u.EmailVerified && u.IsActive && u.DeletedAt == null)
                .Select(u => new { u.Id, u.Email })
                .ToListAsync(cancellationToken);
            return rows.Select(u => (u.Id, u.Email)).ToList();
        }

        var query = _dbContext.Users
            .AsNoTracking()
            .Where(u => u.EmailVerified && u.IsActive && u.DeletedAt == null);

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
