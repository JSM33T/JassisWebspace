using JassSpace.Infra;

namespace JassSpace.Api.Jobs;

public interface ICommentNotificationJob
{
    Task EnqueueForCommentAsync(Guid commentId);
    Task SendNotificationEmailAsync(Guid commentId, Guid recipientUserId, CommentNotificationKind notificationKind);
}
