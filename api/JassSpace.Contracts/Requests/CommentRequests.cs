namespace JassSpace.Contracts.Requests;

public record CreateCommentRequest(
    Guid ContentId,
    Guid? ParentCommentId,
    string Text
);

public record UpdateCommentRequest(
    string Text
);
