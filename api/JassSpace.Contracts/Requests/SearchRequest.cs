using JassSpace.Entities.Enums;

namespace JassSpace.Contracts.Requests;

public sealed record SearchRequest(
    string Query,
    ContentType[]? Types,
    int Page = 1,
    int PageSize = 20);
