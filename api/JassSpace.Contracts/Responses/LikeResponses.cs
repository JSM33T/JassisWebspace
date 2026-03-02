namespace JassSpace.Contracts.Responses;

public record LikeStatusResponse(
    Guid ContentId,
    int LikeCount,
    bool IsLiked
);

