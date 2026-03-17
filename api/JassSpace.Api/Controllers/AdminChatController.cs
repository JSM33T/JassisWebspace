using System.Text.Json;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("admin/chats")]
[Authorize(Roles = "admin")]
public sealed class AdminChatController(
    JassSpaceDbContext dbContext,
    ILogger<AdminChatController> logger)
    : BaseApiController
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<AdminChatSummaryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChats(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = dbContext.Chats
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var trimmedSearch = search.Trim();
            if (Guid.TryParse(trimmedSearch, out var chatId))
            {
                query = query.Where(chat => chat.Id == chatId);
            }
            else
            {
                var normalizedSearch = trimmedSearch.ToLowerInvariant();
                query = query.Where(chat =>
                    (chat.VisitorId != null && chat.VisitorId.ToLower().Contains(normalizedSearch)) ||
                    (chat.User != null && chat.User.Username.ToLower().Contains(normalizedSearch)) ||
                    (chat.User != null && chat.User.Email.ToLower().Contains(normalizedSearch)));
            }
        }

        var total = await query.CountAsync(cancellationToken);

        var chatRows = await query
            .OrderByDescending(chat => chat.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(chat => new ChatRow(
                chat.Id,
                chat.UserId,
                chat.User != null ? chat.User.Username : null,
                chat.User != null ? chat.User.Email : null,
                chat.VisitorId,
                chat.MessagesJson,
                chat.Model,
                chat.CreatedAt,
                chat.UpdatedAt))
            .ToListAsync(cancellationToken);

        var items = chatRows.Select(row =>
        {
            var transcript = ParseTranscript(row.MessagesJson, row.Id);
            return new AdminChatSummaryResponse(
                row.Id,
                row.UserId,
                row.Username,
                row.Email,
                row.VisitorId,
                BuildOwnerDisplay(row.Username, row.Email, row.VisitorId),
                transcript.Count,
                BuildPreview(transcript),
                row.Model,
                row.CreatedAt,
                row.UpdatedAt);
        }).ToList();

        return PagedOk(items, page, pageSize, total);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminChatDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetChat(Guid id, CancellationToken cancellationToken = default)
    {
        var chat = await dbContext.Chats
            .AsNoTracking()
            .Where(item => item.Id == id)
            .Select(item => new ChatRow(
                item.Id,
                item.UserId,
                item.User != null ? item.User.Username : null,
                item.User != null ? item.User.Email : null,
                item.VisitorId,
                item.MessagesJson,
                item.Model,
                item.CreatedAt,
                item.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        if (chat is null)
        {
            return NotFoundProblem("Chat not found", $"No chat found with ID '{id}'.");
        }

        var transcript = ParseTranscript(chat.MessagesJson, chat.Id)
            .Select(message => new AdminChatTranscriptMessageResponse(message.Role, message.Content))
            .ToList();

        return OkEnvelope(new AdminChatDetailResponse(
            chat.Id,
            chat.UserId,
            chat.Username,
            chat.Email,
            chat.VisitorId,
            BuildOwnerDisplay(chat.Username, chat.Email, chat.VisitorId),
            chat.Model,
            chat.CreatedAt,
            chat.UpdatedAt,
            transcript));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteChat(Guid id, CancellationToken cancellationToken = default)
    {
        var chat = await dbContext.Chats.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (chat is null)
        {
            return NotFoundProblem("Chat not found", $"No chat found with ID '{id}'.");
        }

        dbContext.Chats.Remove(chat);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private IReadOnlyList<PersistedChatMessage> ParseTranscript(string messagesJson, Guid chatId)
    {
        try
        {
            var messages = JsonSerializer.Deserialize<List<PersistedChatMessage>>(messagesJson, JsonOptions);
            return messages?.Where(message =>
                    !string.IsNullOrWhiteSpace(message.Role) &&
                    !string.IsNullOrWhiteSpace(message.Content))
                .ToList()
                ?? [];
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse stored chat transcript for admin view on chat {ChatId}.", chatId);
            return [];
        }
    }

    private static string BuildOwnerDisplay(string? username, string? email, string? visitorId)
    {
        if (!string.IsNullOrWhiteSpace(username))
        {
            return !string.IsNullOrWhiteSpace(email)
                ? $"{username} ({email})"
                : username;
        }

        if (!string.IsNullOrWhiteSpace(email))
        {
            return email;
        }

        return !string.IsNullOrWhiteSpace(visitorId)
            ? visitorId
            : "Unknown";
    }

    private static string? BuildPreview(IReadOnlyList<PersistedChatMessage> messages)
    {
        var previewSource = messages.FirstOrDefault(message =>
                                string.Equals(message.Role, "user", StringComparison.OrdinalIgnoreCase) &&
                                !string.IsNullOrWhiteSpace(message.Content))
                            ?? messages.FirstOrDefault(message => !string.IsNullOrWhiteSpace(message.Content));

        if (previewSource is null)
        {
            return null;
        }

        var collapsed = string.Join(
            " ",
            previewSource.Content
                .Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));

        return collapsed.Length <= 160
            ? collapsed
            : $"{collapsed[..157]}...";
    }

    private sealed record ChatRow(
        Guid Id,
        Guid? UserId,
        string? Username,
        string? Email,
        string? VisitorId,
        string MessagesJson,
        string? Model,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt);

    private sealed record PersistedChatMessage(string Role, string Content);
}
