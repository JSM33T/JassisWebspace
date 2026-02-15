namespace JassSpace.Contracts.Responses;

public sealed record AdminDashboardStatsResponse(
    int TotalUsers,
    int LikesLast7Days,
    int CommentsLast7Days
);
