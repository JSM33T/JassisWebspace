namespace JassSpace.Contracts.Requests;

public record CreateEmailTemplateRequest(
    string Name,
    string Subject,
    string HtmlBody,
    string? TextBody);

public record UpdateEmailTemplateRequest(
    string Name,
    string Subject,
    string HtmlBody,
    string? TextBody);

public record TestEmailRequest(
    Dictionary<string, string> Variables,
    List<Guid> TestRecipientUserIds);

public record BroadcastEmailRequest(
    Dictionary<string, string> Variables,
    string Mode,
    BroadcastRecipientFilter Filter);

public record UpdateEmailPreferencesRequest(bool ReceiveBroadcastEmails);

public record BroadcastRecipientFilter(
    List<string>? Roles = null,
    List<Guid>? UserIds = null);
