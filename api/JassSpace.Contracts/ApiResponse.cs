using System.Text.Json.Serialization;

namespace JassSpace.Contracts;

public sealed record ApiResponse<T>(
    T Data,
    object? Meta = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] bool? IsFromCache = null);

public sealed record PagedMeta(int Page, int PageSize, long Total);
