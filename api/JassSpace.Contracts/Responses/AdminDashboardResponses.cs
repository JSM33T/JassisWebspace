using System.Diagnostics.CodeAnalysis;

namespace JassSpace.Contracts.Responses;

[SuppressMessage("ReSharper", "NotAccessedPositionalProperty.Global")]
public sealed record AdminDashboardStatsResponse(
    int TotalUsers,
    int LikesLast7Days,
    int CommentsLast7Days
);
