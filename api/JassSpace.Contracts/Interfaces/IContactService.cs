using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum ContactCreateStatus
{
    Success,
    InvalidName,
    InvalidEmail,
    InvalidPurpose,
    InvalidMessage
}

public sealed record ContactCreateResult(
    ContactCreateStatus Status,
    ContactResponse? Response = null,
    string? ErrorMessage = null
);

public enum ContactDeleteStatus
{
    Success,
    NotFound
}

public sealed record ContactDeleteResult(
    ContactDeleteStatus Status,
    string? ErrorMessage = null
);

public interface IContactService
{
    Task<ContactCreateResult> CreateContactAsync(
        CreateContactRequest request,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyCollection<AdminContactMessageResponse> Items, int Page, int PageSize, int Total)> GetMessagesAsync(
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<ContactDeleteResult> DeleteMessageAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
