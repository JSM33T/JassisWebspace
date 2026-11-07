namespace JassSpace.Contracts.Requests;

public sealed record SavedContentStatusRequest(IReadOnlyList<Guid> ContentIds);
