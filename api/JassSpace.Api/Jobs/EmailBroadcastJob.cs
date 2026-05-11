using Hangfire;
using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Infra;
using JassSpace.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace JassSpace.Api.Jobs;

public sealed class EmailBroadcastJob(
    JassSpaceDbContext dbContext,
    IEmailService emailService,
    IUnsubscribeTokenService tokenService,
    IConfiguration configuration,
    ILogger<EmailBroadcastJob> logger) : IEmailBroadcastJob
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IEmailService _emailService = emailService;
    private readonly IUnsubscribeTokenService _tokenService = tokenService;
    private readonly ILogger<EmailBroadcastJob> _logger = logger;
    private string ApiUrl => configuration["ApiUrl"] ?? "http://localhost:5001";

    [AutomaticRetry(Attempts = 3)]
    public async Task ExecuteAsync(Guid templateId, Dictionary<string, string> manualVars, List<Guid> recipientUserIds)
    {
        var template = await _dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (template is null)
        {
            _logger.LogWarning("EmailBroadcastJob: template {TemplateId} not found, skipping.", templateId);
            return;
        }

        // Re-check opt-out at send time (user may have unsubscribed after job was enqueued)
        var optedOutIds = await _dbContext.UserEmailPreferences
            .AsNoTracking()
            .Where(p => recipientUserIds.Contains(p.UserId) && !p.ReceiveBroadcastEmails)
            .Select(p => p.UserId)
            .ToListAsync();

        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(u => recipientUserIds.Contains(u.Id)
                     && !optedOutIds.Contains(u.Id)
                     && u.EmailVerified && u.IsActive && u.DeletedAt == null)
            .Select(u => new { u.Id, u.Email, u.FirstName, u.LastName, u.Username, u.DisplayName })
            .ToListAsync();

        var sent = 0;
        var failed = 0;

        foreach (var user in users)
        {
            try
            {
                var vars = new Dictionary<string, string>(manualVars, StringComparer.OrdinalIgnoreCase)
                {
                    ["firstName"]   = user.FirstName ?? string.Empty,
                    ["lastName"]    = user.LastName ?? string.Empty,
                    ["username"]    = user.Username,
                    ["email"]       = user.Email,
                    ["displayName"] = user.DisplayName ?? user.FirstName ?? user.Username,
                };

                var subject = AdminEmailService.Substitute(template.Subject, vars);
                var unsubUrl = $"{ApiUrl}/account/email-preferences/unsubscribe?token={_tokenService.GenerateToken(user.Id)}";
                var body = AdminEmailService.AppendFooter(
                    AdminEmailService.Substitute(template.HtmlBody, vars),
                    unsubUrl);

                await _emailService.SendEmailAsync(user.Email, subject, body, isHtml: true);
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "EmailBroadcastJob: failed to send to user {UserId} ({Email})", user.Id, user.Email);
                failed++;
            }
        }

        _logger.LogInformation(
            "EmailBroadcastJob completed for template {TemplateId}: {Sent} sent, {Failed} failed.",
            templateId, sent, failed);
    }
}
