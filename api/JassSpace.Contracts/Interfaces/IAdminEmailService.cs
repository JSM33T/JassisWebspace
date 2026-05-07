using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface IAdminEmailService
{
    Task<List<EmailTemplateResponse>> GetTemplatesAsync(CancellationToken cancellationToken = default);
    Task<EmailTemplateResponse?> GetTemplateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AdminEmailMutationResult> CreateTemplateAsync(CreateEmailTemplateRequest request, CancellationToken cancellationToken = default);
    Task<AdminEmailMutationResult> UpdateTemplateAsync(Guid id, UpdateEmailTemplateRequest request, CancellationToken cancellationToken = default);
    Task<AdminEmailMutationResult> DeleteTemplateAsync(Guid id, CancellationToken cancellationToken = default);
    Task<AdminEmailSendResult> TestSendAsync(Guid id, TestEmailRequest request, CancellationToken cancellationToken = default);
    Task<AdminEmailSendResult> BroadcastAsync(Guid id, BroadcastEmailRequest request, CancellationToken cancellationToken = default);
}
