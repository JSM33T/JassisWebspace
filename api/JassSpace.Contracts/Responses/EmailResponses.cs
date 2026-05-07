namespace JassSpace.Contracts.Responses;

public record EmailTemplateResponse(
    Guid Id,
    string Name,
    string Subject,
    string HtmlBody,
    string? TextBody,
    List<string> Variables,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public enum AdminEmailMutationStatus
{
    Success,
    NotFound,
    DuplicateName,
    InvalidRequest
}

public record AdminEmailMutationResult(
    AdminEmailMutationStatus Status,
    EmailTemplateResponse? Template = null,
    string? ErrorMessage = null);

public enum AdminEmailSendStatus
{
    Success,
    NotFound,
    InvalidRecipients,
    SendFailed
}

public record AdminEmailSendResult(
    AdminEmailSendStatus Status,
    int RecipientCount = 0,
    string? JobId = null,
    string? ErrorMessage = null);
