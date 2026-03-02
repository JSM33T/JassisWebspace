using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using JassSpace.Api.Configuration;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Jobs;

public sealed class CommentNotificationJob(
    JassSpaceDbContext dbContext,
    IEmailService emailService,
    IBackgroundJobClient backgroundJobClient,
    IOptions<HangfireSettings> hangfireSettings,
    IConfiguration configuration,
    ILogger<CommentNotificationJob> logger) : ICommentNotificationJob
{
    private readonly HangfireSettings _hangfireSettings = hangfireSettings.Value;

    public async Task EnqueueForCommentAsync(Guid commentId)
    {
        var comment = await dbContext.Comments
            .AsNoTracking()
            .Include(c => c.Content)
            .FirstOrDefaultAsync(c => c.Id == commentId && !c.IsDeleted);

        if (comment is null)
        {
            logger.LogWarning("Skipping comment notification enqueue because comment {CommentId} was not found.", commentId);
            return;
        }

        var recipients = await ResolveRecipientsAsync(comment);
        if (recipients.Count == 0)
        {
            logger.LogInformation("No eligible recipients for comment {CommentId}.", commentId);
            return;
        }

        var queueName = string.IsNullOrWhiteSpace(_hangfireSettings.QueueName) ? "emails" : _hangfireSettings.QueueName;
        foreach (var recipient in recipients)
        {
            backgroundJobClient.Create(
                Job.FromExpression<ICommentNotificationJob>(job =>
                    job.SendNotificationEmailAsync(commentId, recipient.UserId, recipient.Kind)),
                new EnqueuedState(queueName));
        }

        logger.LogInformation(
            "Enqueued {RecipientCount} notification email jobs for comment {CommentId} on queue {QueueName}.",
            recipients.Count,
            commentId,
            queueName);
    }

    [AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]
    public async Task SendNotificationEmailAsync(Guid commentId, Guid recipientUserId, CommentNotificationKind notificationKind)
    {
        var comment = await dbContext.Comments
            .AsNoTracking()
            .Include(c => c.Content)
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == commentId && !c.IsDeleted);

        if (comment is null)
        {
            logger.LogWarning("Skipping email send because comment {CommentId} no longer exists.", commentId);
            return;
        }

        var recipient = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == recipientUserId && u.EmailVerified && u.IsActive && u.DeletedAt == null)
            .Select(u => new { u.Id, u.Email, u.Username, u.DisplayName, u.FirstName })
            .FirstOrDefaultAsync();

        if (recipient is null)
        {
            logger.LogInformation(
                "Skipping email send for comment {CommentId}; recipient {RecipientUserId} is no longer eligible.",
                commentId,
                recipientUserId);
            return;
        }

        if (recipient.Id == comment.UserId)
        {
            logger.LogInformation(
                "Skipping self notification for comment {CommentId} and user {UserId}.",
                commentId,
                recipient.Id);
            return;
        }

        string? parentCommentText = null;
        if (notificationKind == CommentNotificationKind.Reply && comment.ParentCommentId.HasValue)
        {
            parentCommentText = await dbContext.Comments
                .AsNoTracking()
                .Where(c => c.Id == comment.ParentCommentId.Value && !c.IsDeleted)
                .Select(c => c.Text)
                .FirstOrDefaultAsync();
        }

        var actorName = string.IsNullOrWhiteSpace(comment.User.DisplayName) ? comment.User.Username : comment.User.DisplayName;
        var recipientName = !string.IsNullOrWhiteSpace(recipient.DisplayName)
            ? recipient.DisplayName
            : !string.IsNullOrWhiteSpace(recipient.FirstName)
                ? recipient.FirstName
                : recipient.Username;

        var contentUrl = BuildContentUrl(comment.Content);

        var model = new CommentNotificationEmailModel(
            notificationKind,
            recipientName ?? recipient.Username,
            recipient.Email,
            actorName ?? comment.User.Username,
            comment.Content.Title,
            comment.Content.ContentType.ToString(),
            contentUrl,
            comment.Text,
            parentCommentText);

        await emailService.SendCommentNotificationEmailAsync(model);

        logger.LogInformation(
            "Sent comment notification email for comment {CommentId} to user {RecipientUserId}.",
            commentId,
            recipientUserId);
    }

    private async Task<List<RecipientTarget>> ResolveRecipientsAsync(Comment comment)
    {
        var targetKindsByUserId = new Dictionary<Guid, CommentNotificationKind>();

        if (comment.ParentCommentId.HasValue)
        {
            var parent = await dbContext.Comments
                .AsNoTracking()
                .Where(c => c.Id == comment.ParentCommentId.Value && !c.IsDeleted)
                .Select(c => new { c.UserId, c.ContentId })
                .FirstOrDefaultAsync();

            if (parent is null)
            {
                logger.LogWarning(
                    "Parent comment {ParentCommentId} not found while resolving recipients for comment {CommentId}.",
                    comment.ParentCommentId.Value,
                    comment.Id);

                return [];
            }

            if (parent.ContentId != comment.ContentId)
            {
                logger.LogWarning(
                    "Skipping notifications for comment {CommentId} because parent content mismatch was detected.",
                    comment.Id);

                return [];
            }

            targetKindsByUserId[parent.UserId] = CommentNotificationKind.Reply;
        }
        else
        {
            var authorIds = await ResolveContentAuthorIdsAsync(comment.Content);
            foreach (var authorId in authorIds)
            {
                targetKindsByUserId[authorId] = CommentNotificationKind.NewTopLevelComment;
            }
        }

        targetKindsByUserId.Remove(comment.UserId);

        if (targetKindsByUserId.Count == 0)
        {
            return [];
        }

        var candidateIds = targetKindsByUserId.Keys.ToList();

        var eligibleIds = await dbContext.Users
            .AsNoTracking()
            .Where(u => candidateIds.Contains(u.Id) && u.EmailVerified && u.IsActive && u.DeletedAt == null)
            .Select(u => u.Id)
            .ToListAsync();

        return eligibleIds
            .Select(id => new RecipientTarget(id, targetKindsByUserId[id]))
            .ToList();
    }

    private async Task<List<Guid>> ResolveContentAuthorIdsAsync(Content content)
    {
        switch (content.ContentType)
        {
            case ContentType.Blog:
                return await dbContext.BlogAuthors
                .AsNoTracking()
                .Where(a => a.BlogId == content.ContentRefId)
                .Select(a => a.UserId)
                .Distinct()
                .ToListAsync();
            case ContentType.Album:
                return await dbContext.GalleryAuthors
                .AsNoTracking()
                .Where(a => a.AlbumId == content.ContentRefId)
                .Select(a => a.UserId)
                .Distinct()
                .ToListAsync();
            case ContentType.Music:
                return await dbContext.TrackAuthors
                .AsNoTracking()
                .Where(a => a.TrackId == content.ContentRefId)
                .Select(a => a.UserId)
                .Distinct()
                .ToListAsync();
            default:
                logger.LogWarning(
                    "Content type {ContentType} is not supported for owner notifications. ContentId: {ContentId}.",
                    content.ContentType,
                    content.Id);
                return [];
        }
    }

    private string BuildContentUrl(Content content)
    {
        var baseUrl = (configuration.GetValue<string>("Frontend:BaseUrl") ?? "http://localhost:3000").TrimEnd('/');

        var path = content.ContentType switch
        {
            ContentType.Blog => $"/blog/{Uri.EscapeDataString(content.Slug)}",
            ContentType.Album => $"/gallery/{Uri.EscapeDataString(content.Slug)}",
            ContentType.Music => $"/music/{Uri.EscapeDataString(content.Slug)}",
            _ => "/"
        };

        return $"{baseUrl}{path}";
    }

    private sealed record RecipientTarget(Guid UserId, CommentNotificationKind Kind);
}
