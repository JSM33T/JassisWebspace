using System.Net.Mail;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class ContactService(JassSpaceDbContext dbContext) : IContactService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<ContactCreateResult> CreateContactAsync(
        CreateContactRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new ContactCreateResult(ContactCreateStatus.InvalidName, ErrorMessage: "Name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return new ContactCreateResult(ContactCreateStatus.InvalidEmail, ErrorMessage: "Email is required.");
        }

        if (!MailAddress.TryCreate(request.Email, out _))
        {
            return new ContactCreateResult(ContactCreateStatus.InvalidEmail, ErrorMessage: "Email format is invalid.");
        }

        if (string.IsNullOrWhiteSpace(request.Purpose))
        {
            return new ContactCreateResult(ContactCreateStatus.InvalidPurpose, ErrorMessage: "Purpose is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return new ContactCreateResult(ContactCreateStatus.InvalidMessage, ErrorMessage: "Message is required.");
        }

        var now = DateTimeOffset.UtcNow;
        var contact = new Contact
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
            Purpose = request.Purpose.Trim(),
            Message = request.Message.Trim(),
            RefUrl = string.IsNullOrWhiteSpace(request.RefUrl) ? null : request.RefUrl.Trim(),
            CreatedAt = now
        };

        _dbContext.Contacts.Add(contact);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ContactCreateResult(
            ContactCreateStatus.Success,
            new ContactResponse(contact.Id, contact.CreatedAt));
    }

    public async Task<(IReadOnlyCollection<AdminContactMessageResponse> Items, int Page, int PageSize, int Total)> GetMessagesAsync(
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.Contacts
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(term) ||
                c.Email.ToLower().Contains(term) ||
                c.Purpose.ToLower().Contains(term) ||
                c.Message.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new AdminContactMessageResponse(
                c.Id,
                c.Name,
                c.Email,
                c.Purpose,
                c.Message,
                c.RefUrl,
                c.CreatedAt))
            .ToListAsync(cancellationToken);

        return (items, page, pageSize, total);
    }

    public async Task<ContactDeleteResult> DeleteMessageAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var message = await _dbContext.Contacts
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (message is null)
        {
            return new ContactDeleteResult(
                ContactDeleteStatus.NotFound,
                $"No message found with ID '{id}'.");
        }

        _dbContext.Contacts.Remove(message);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ContactDeleteResult(ContactDeleteStatus.Success);
    }
}
