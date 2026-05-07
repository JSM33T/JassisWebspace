namespace JassSpace.Contracts.Responses;

public record ContentAuthorResponse(
    Guid UserId,
    string Username,
    string? DisplayName,
    string? Role,
    int Order
);
