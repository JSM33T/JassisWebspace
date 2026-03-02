namespace JassSpace.Infra;

public enum CommentNotificationKind
{
    Reply = 1,
    NewTopLevelComment = 2
}

public sealed record CommentNotificationEmailModel(
    CommentNotificationKind Kind,
    string RecipientName,
    string RecipientEmail,
    string ActorName,
    string ContentTitle,
    string ContentType,
    string ContentUrl,
    string CommentText,
    string? ParentCommentText);
