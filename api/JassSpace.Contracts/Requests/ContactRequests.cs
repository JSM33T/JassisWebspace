namespace JassSpace.Contracts.Requests;

public sealed record CreateContactRequest(
    string Name,
    string Email,
    string Purpose,
    string Message,
    string? RefUrl
);
