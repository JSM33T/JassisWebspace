using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JassSpace.Services;

public sealed class DevelopmentService(
    JassSpaceDbContext dbContext,
    HttpClient httpClient,
    IMemoryCache cache,
    IOptions<DevelopmentGitHubOptions> options,
    IEmailService emailService,
    IConfiguration configuration,
    ILogger<DevelopmentService> logger)
    : IDevelopmentService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly HttpClient _httpClient = httpClient;
    private readonly IMemoryCache _cache = cache;
    private readonly DevelopmentGitHubOptions _options = options.Value;
    private readonly IEmailService _emailService = emailService;
    private readonly IConfiguration _configuration = configuration;
    private readonly ILogger<DevelopmentService> _logger = logger;

    public async Task<DevelopmentSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var openCount = await GetIssueCountAsync("open", cancellationToken);
        var closedCount = await GetIssueCountAsync("closed", cancellationToken);
        var issues = await GetIssuesAsync("open", null, null, null, 1, 6, cancellationToken);
        var releases = await GetReleasesAsync(1, 4, cancellationToken);
        var notes = await GetNotesAsync(publicOnly: true, 1, 6, cancellationToken);
        var suggestions = await GetPublicSuggestionsAsync(1, 6, cancellationToken);

        return new DevelopmentSummaryResponse(openCount, closedCount, issues, releases, notes, suggestions);
    }

    public async Task<IReadOnlyList<DevelopmentIssueResponse>> GetIssuesAsync(
        string? state,
        string? label,
        string? milestone,
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var normalizedState = NormalizeIssueState(state);
        var cacheKey = $"development:github:issues:{normalizedState}:{label}:{milestone}:{page}:{pageSize}";

        var issues = await GetCachedGitHubDataAsync(
            cacheKey,
            () => FetchIssuesAsync(normalizedState, label, milestone, page, pageSize, cancellationToken),
            cancellationToken);

        if (string.IsNullOrWhiteSpace(search))
        {
            return issues;
        }

        var term = search.Trim();
        return issues
            .Where(issue =>
                issue.Title.Contains(term, StringComparison.OrdinalIgnoreCase) ||
                (issue.Body?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false))
            .ToList();
    }

    public async Task<IReadOnlyList<DevelopmentReleaseResponse>> GetReleasesAsync(
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 30);
        var cacheKey = $"development:github:releases:{page}:{pageSize}";

        return await GetCachedGitHubDataAsync(
            cacheKey,
            () => FetchReleasesAsync(page, pageSize, cancellationToken),
            cancellationToken);
    }

    public async Task<IReadOnlyList<DevelopmentSuggestionResponse>> GetPublicSuggestionsAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        return await _dbContext.DevelopmentSuggestions
            .AsNoTracking()
            .Include(s => s.User)
            .Where(s =>
                s.Status == DevelopmentSuggestionStatuses.Approved ||
                s.Status == DevelopmentSuggestionStatuses.Promoted)
            .OrderByDescending(s => s.ReviewedAt ?? s.UpdatedAt ?? s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => ToSuggestionResponse(s))
            .ToListAsync(cancellationToken);
    }

    public async Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> CreateSuggestionAsync(
        Guid userId,
        CreateDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateSuggestion(request.Title, request.Body);
        if (validation is not null)
        {
            return validation;
        }

        var now = DateTimeOffset.UtcNow;
        var suggestion = new DevelopmentSuggestion
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Status = DevelopmentSuggestionStatuses.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.DevelopmentSuggestions.Add(suggestion);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var created = await _dbContext.DevelopmentSuggestions
            .AsNoTracking()
            .Include(s => s.User)
            .FirstAsync(s => s.Id == suggestion.Id, cancellationToken);

        return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
            DevelopmentMutationStatus.Success,
            ToSuggestionResponse(created));
    }

    public async Task<(IReadOnlyCollection<DevelopmentSuggestionResponse> Items, int Page, int PageSize, int Total)> GetAdminSuggestionsAsync(
        string? status,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.DevelopmentSuggestions
            .AsNoTracking()
            .Include(s => s.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            query = query.Where(s => s.Status == normalizedStatus);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => ToSuggestionResponse(s))
            .ToListAsync(cancellationToken);

        return (items, page, pageSize, total);
    }

    public async Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> UpdateSuggestionStatusAsync(
        Guid id,
        Guid reviewedByUserId,
        UpdateDevelopmentSuggestionStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var status = request.Status?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(status) || !DevelopmentSuggestionStatuses.All.Contains(status))
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidStatus,
                ErrorMessage: "Status must be pending, approved, rejected, archived, or promoted.");
        }

        var suggestion = await _dbContext.DevelopmentSuggestions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (suggestion is null)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.NotFound,
                ErrorMessage: $"No suggestion found with ID '{id}'.");
        }

        suggestion.Status = status;
        suggestion.ReviewedAt = DateTimeOffset.UtcNow;
        suggestion.ReviewedByUserId = reviewedByUserId;
        suggestion.UpdatedAt = suggestion.ReviewedAt;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
            DevelopmentMutationStatus.Success,
            ToSuggestionResponse(suggestion));
    }

    public async Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> UpdateSuggestionAsync(
        Guid id,
        Guid reviewedByUserId,
        UpdateDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateSuggestion(request.Title, request.Body);
        if (validation is not null)
        {
            return validation;
        }

        var status = request.Status?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(status) || !DevelopmentSuggestionStatuses.All.Contains(status))
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidStatus,
                ErrorMessage: "Status must be pending, approved, rejected, archived, or promoted.");
        }

        var suggestion = await _dbContext.DevelopmentSuggestions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (suggestion is null)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.NotFound,
                ErrorMessage: $"No suggestion found with ID '{id}'.");
        }

        if (string.Equals(status, DevelopmentSuggestionStatuses.Promoted, StringComparison.OrdinalIgnoreCase) &&
            !suggestion.GitHubIssueNumber.HasValue)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidStatus,
                ToSuggestionResponse(suggestion),
                "Promote this suggestion to GitHub before marking it promoted.");
        }

        var now = DateTimeOffset.UtcNow;
        suggestion.Title = request.Title.Trim();
        suggestion.Body = request.Body.Trim();
        suggestion.Status = status;
        suggestion.UpdatedAt = now;

        if (string.Equals(status, DevelopmentSuggestionStatuses.Pending, StringComparison.OrdinalIgnoreCase))
        {
            suggestion.ReviewedAt = null;
            suggestion.ReviewedByUserId = null;
        }
        else
        {
            suggestion.ReviewedAt = now;
            suggestion.ReviewedByUserId = reviewedByUserId;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
            DevelopmentMutationStatus.Success,
            ToSuggestionResponse(suggestion));
    }

    public async Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> PromoteSuggestionAsync(
        Guid id,
        Guid reviewedByUserId,
        PromoteDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        var suggestion = await _dbContext.DevelopmentSuggestions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (suggestion is null)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.NotFound,
                ErrorMessage: $"No suggestion found with ID '{id}'.");
        }

        if (suggestion.GitHubIssueNumber.HasValue)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.AlreadyPromoted,
                ToSuggestionResponse(suggestion),
                "This suggestion is already linked to a GitHub issue.");
        }

        if (!string.Equals(suggestion.Status, DevelopmentSuggestionStatuses.Approved, StringComparison.OrdinalIgnoreCase))
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidStatus,
                ToSuggestionResponse(suggestion),
                "Approve this suggestion before promoting it.");
        }

        var title = string.IsNullOrWhiteSpace(request.Title) ? suggestion.Title : request.Title.Trim();
        var body = string.IsNullOrWhiteSpace(request.Body) ? suggestion.Body : request.Body.Trim();
        var validation = ValidateSuggestion(title, body);
        if (validation is not null)
        {
            return validation;
        }

        try
        {
            var profileUrl = BuildUserProfileUrl(suggestion.User.Username);
            var createdIssue = await CreateGitHubIssueAsync(
                title,
                BuildPromotedIssueBody(body, suggestion, profileUrl),
                cancellationToken);

            var now = DateTimeOffset.UtcNow;
            suggestion.Status = DevelopmentSuggestionStatuses.Promoted;
            suggestion.GitHubIssueNumber = createdIssue.Number;
            suggestion.GitHubIssueUrl = createdIssue.Url;
            suggestion.ReviewedAt = now;
            suggestion.ReviewedByUserId = reviewedByUserId;
            suggestion.UpdatedAt = now;

            await _dbContext.SaveChangesAsync(cancellationToken);

            await SendPromotionEmailAsync(suggestion, title, createdIssue, profileUrl, cancellationToken);

            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.Success,
                ToSuggestionResponse(suggestion));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "GitHub issue promotion was not available for suggestion {SuggestionId}.", id);
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.GitHubUnavailable,
                ErrorMessage: ex.Message);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "GitHub issue promotion failed for suggestion {SuggestionId}.", id);
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.GitHubUnavailable,
                ErrorMessage: "GitHub rejected the issue creation request.");
        }
    }

    public async Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> ClosePromotedIssueAsync(
        Guid id,
        Guid reviewedByUserId,
        CancellationToken cancellationToken = default)
    {
        var suggestion = await _dbContext.DevelopmentSuggestions
            .Include(s => s.User)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (suggestion is null)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.NotFound,
                ErrorMessage: $"No suggestion found with ID '{id}'.");
        }

        if (!suggestion.GitHubIssueNumber.HasValue)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidStatus,
                ToSuggestionResponse(suggestion),
                "This suggestion is not linked to a GitHub issue.");
        }

        try
        {
            await CloseGitHubIssueAsync(suggestion.GitHubIssueNumber.Value, cancellationToken);

            var now = DateTimeOffset.UtcNow;
            suggestion.Status = DevelopmentSuggestionStatuses.Archived;
            suggestion.ReviewedAt = now;
            suggestion.ReviewedByUserId = reviewedByUserId;
            suggestion.UpdatedAt = now;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.Success,
                ToSuggestionResponse(suggestion));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "GitHub issue close was not available for suggestion {SuggestionId}.", id);
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.GitHubUnavailable,
                ErrorMessage: ex.Message);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "GitHub issue close failed for suggestion {SuggestionId}.", id);
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.GitHubUnavailable,
                ErrorMessage: "GitHub rejected the issue close request.");
        }
    }

    public async Task<DevelopmentMutationResult<bool>> DeleteSuggestionAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var suggestion = await _dbContext.DevelopmentSuggestions.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (suggestion is null)
        {
            return new DevelopmentMutationResult<bool>(
                DevelopmentMutationStatus.NotFound,
                false,
                $"No suggestion found with ID '{id}'.");
        }

        _dbContext.DevelopmentSuggestions.Remove(suggestion);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DevelopmentMutationResult<bool>(DevelopmentMutationStatus.Success, true);
    }

    public async Task<IReadOnlyList<DevelopmentNoteResponse>> GetNotesAsync(
        bool publicOnly,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.DevelopmentNotes.AsNoTracking().AsQueryable();
        if (publicOnly)
        {
            query = query.Where(n => n.IsPublished);
        }

        return await query
            .OrderByDescending(n => n.PublishedAt ?? n.UpdatedAt ?? n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => ToNoteResponse(n))
            .ToListAsync(cancellationToken);
    }

    public async Task<DevelopmentMutationResult<DevelopmentNoteResponse>> CreateNoteAsync(
        Guid createdByUserId,
        CreateDevelopmentNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateNote(request.Title, request.Body, request.Category);
        if (validation is not null)
        {
            return validation;
        }

        var now = DateTimeOffset.UtcNow;
        var note = new DevelopmentNote
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Body = request.Body.Trim(),
            Version = string.IsNullOrWhiteSpace(request.Version) ? null : request.Version.Trim(),
            Category = request.Category.Trim().ToLowerInvariant(),
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished ? request.PublishedAt ?? now : request.PublishedAt,
            CreatedByUserId = createdByUserId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.DevelopmentNotes.Add(note);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DevelopmentMutationResult<DevelopmentNoteResponse>(
            DevelopmentMutationStatus.Success,
            ToNoteResponse(note));
    }

    public async Task<DevelopmentMutationResult<DevelopmentNoteResponse>> UpdateNoteAsync(
        Guid id,
        UpdateDevelopmentNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateNote(request.Title, request.Body, request.Category);
        if (validation is not null)
        {
            return validation;
        }

        var note = await _dbContext.DevelopmentNotes.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (note is null)
        {
            return new DevelopmentMutationResult<DevelopmentNoteResponse>(
                DevelopmentMutationStatus.NotFound,
                ErrorMessage: $"No development note found with ID '{id}'.");
        }

        note.Title = request.Title.Trim();
        note.Body = request.Body.Trim();
        note.Version = string.IsNullOrWhiteSpace(request.Version) ? null : request.Version.Trim();
        note.Category = request.Category.Trim().ToLowerInvariant();
        note.IsPublished = request.IsPublished;
        note.PublishedAt = request.IsPublished ? request.PublishedAt ?? note.PublishedAt ?? DateTimeOffset.UtcNow : request.PublishedAt;
        note.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DevelopmentMutationResult<DevelopmentNoteResponse>(
            DevelopmentMutationStatus.Success,
            ToNoteResponse(note));
    }

    public async Task<DevelopmentMutationResult<bool>> DeleteNoteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var note = await _dbContext.DevelopmentNotes.FirstOrDefaultAsync(n => n.Id == id, cancellationToken);
        if (note is null)
        {
            return new DevelopmentMutationResult<bool>(
                DevelopmentMutationStatus.NotFound,
                false,
                $"No development note found with ID '{id}'.");
        }

        _dbContext.DevelopmentNotes.Remove(note);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new DevelopmentMutationResult<bool>(DevelopmentMutationStatus.Success, true);
    }

    private async Task<int> GetIssueCountAsync(string state, CancellationToken cancellationToken)
    {
        var cacheKey = $"development:github:issue-count:{state}";
        return await GetCachedGitHubDataAsync(
            cacheKey,
            async () =>
            {
                var q = Uri.EscapeDataString($"repo:{_options.Owner}/{_options.Repository} is:issue state:{state}");
                using var doc = await SendGitHubJsonAsync(
                    HttpMethod.Get,
                    $"https://api.github.com/search/issues?q={q}&per_page=1",
                    null,
                    cancellationToken);

                return doc.RootElement.TryGetProperty("total_count", out var total) ? total.GetInt32() : 0;
            },
            cancellationToken);
    }

    private async Task<IReadOnlyList<DevelopmentIssueResponse>> FetchIssuesAsync(
        string state,
        string? label,
        string? milestone,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var query = new List<string>
        {
            $"state={Uri.EscapeDataString(state)}",
            $"page={page}",
            $"per_page={pageSize}",
            "sort=updated",
            "direction=desc"
        };

        if (!string.IsNullOrWhiteSpace(label))
        {
            query.Add($"labels={Uri.EscapeDataString(label.Trim())}");
        }

        if (!string.IsNullOrWhiteSpace(milestone))
        {
            query.Add($"milestone={Uri.EscapeDataString(milestone.Trim())}");
        }

        using var doc = await SendGitHubJsonAsync(
            HttpMethod.Get,
            $"https://api.github.com/repos/{_options.Owner}/{_options.Repository}/issues?{string.Join("&", query)}",
            null,
            cancellationToken);

        var issues = new List<DevelopmentIssueResponse>();
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (item.TryGetProperty("pull_request", out _))
            {
                continue;
            }

            issues.Add(ParseIssue(item));
        }

        return issues;
    }

    private async Task<IReadOnlyList<DevelopmentReleaseResponse>> FetchReleasesAsync(
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        using var doc = await SendGitHubJsonAsync(
            HttpMethod.Get,
            $"https://api.github.com/repos/{_options.Owner}/{_options.Repository}/releases?page={page}&per_page={pageSize}",
            null,
            cancellationToken);

        return doc.RootElement.EnumerateArray().Select(ParseRelease).ToList();
    }

    private async Task<DevelopmentIssueResponse> CreateGitHubIssueAsync(
        string title,
        string body,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Token))
        {
            throw new InvalidOperationException("GitHub token is not configured.");
        }

        using var payload = JsonSerializer.SerializeToDocument(new
        {
            title,
            body,
            labels = new[] { "from-site", "suggestion" }
        });

        using var doc = await SendGitHubJsonAsync(
            HttpMethod.Post,
            $"https://api.github.com/repos/{_options.Owner}/{_options.Repository}/issues",
            payload.RootElement.GetRawText(),
            cancellationToken);

        return ParseIssue(doc.RootElement);
    }

    private async Task CloseGitHubIssueAsync(int issueNumber, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Token))
        {
            throw new InvalidOperationException("GitHub token is not configured.");
        }

        using var payload = JsonSerializer.SerializeToDocument(new
        {
            state = "closed",
            state_reason = "completed"
        });

        using var _ = await SendGitHubJsonAsync(
            HttpMethod.Patch,
            $"https://api.github.com/repos/{_options.Owner}/{_options.Repository}/issues/{issueNumber}",
            payload.RootElement.GetRawText(),
            cancellationToken);
    }

    private async Task<T> GetCachedGitHubDataAsync<T>(
        string cacheKey,
        Func<Task<T>> factory,
        CancellationToken cancellationToken)
    {
        if (_options.CacheMinutes <= 0)
        {
            return await factory();
        }

        var cached = await _cache.GetOrCreateAsync(cacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(Math.Clamp(_options.CacheMinutes, 1, 60));
            return await factory();
        });

        cancellationToken.ThrowIfCancellationRequested();
        return cached!;
    }

    private async Task<JsonDocument> SendGitHubJsonAsync(
        HttpMethod method,
        string url,
        string? jsonBody,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, url);
        request.Headers.UserAgent.Add(new ProductInfoHeaderValue("JassSpace", "1.0"));
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        request.Headers.TryAddWithoutValidation("X-GitHub-Api-Version", "2022-11-28");

        if (!string.IsNullOrWhiteSpace(_options.Token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.Token);
        }

        if (jsonBody is not null)
        {
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
        }

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            var message = ExtractGitHubErrorMessage(errorBody);
            _logger.LogWarning(
                "GitHub request to {Url} failed with {StatusCode}. Message: {Message}",
                url,
                response.StatusCode,
                message);

            throw new InvalidOperationException(
                $"GitHub returned {(int)response.StatusCode} ({response.StatusCode}): {message}");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
    }

    private static DevelopmentIssueResponse ParseIssue(JsonElement item)
    {
        var labels = new List<string>();
        if (item.TryGetProperty("labels", out var labelsElement) && labelsElement.ValueKind == JsonValueKind.Array)
        {
            labels.AddRange(labelsElement.EnumerateArray().Select(label => GetString(label, "name")).Where(name => !string.IsNullOrWhiteSpace(name))!);
        }

        return new DevelopmentIssueResponse(
            GetInt(item, "number"),
            GetString(item, "title") ?? "Untitled issue",
            GetString(item, "state") ?? "open",
            GetString(item, "html_url") ?? string.Empty,
            GetString(item, "body"),
            labels,
            TryGetObjectString(item, "milestone", "title"),
            TryGetObjectString(item, "assignee", "login"),
            GetDate(item, "created_at") ?? DateTimeOffset.UtcNow,
            GetDate(item, "updated_at") ?? DateTimeOffset.UtcNow,
            GetDate(item, "closed_at"),
            GetString(item, "state_reason"));
    }

    private static DevelopmentReleaseResponse ParseRelease(JsonElement item)
    {
        return new DevelopmentReleaseResponse(
            GetLong(item, "id"),
            GetString(item, "tag_name") ?? "untagged",
            GetString(item, "name") ?? GetString(item, "tag_name") ?? "Release",
            GetString(item, "body"),
            GetString(item, "html_url") ?? string.Empty,
            GetBool(item, "draft"),
            GetBool(item, "prerelease"),
            GetDate(item, "created_at") ?? DateTimeOffset.UtcNow,
            GetDate(item, "published_at"));
    }

    private static DevelopmentSuggestionResponse ToSuggestionResponse(DevelopmentSuggestion suggestion)
        => new(
            suggestion.Id,
            suggestion.Title,
            suggestion.Body,
            suggestion.Status,
            suggestion.UserId,
            suggestion.User.Username,
            suggestion.User.DisplayName,
            suggestion.GitHubIssueNumber,
            suggestion.GitHubIssueUrl,
            suggestion.CreatedAt,
            suggestion.UpdatedAt,
            suggestion.ReviewedAt);

    private static DevelopmentNoteResponse ToNoteResponse(DevelopmentNote note)
        => new(
            note.Id,
            note.Title,
            note.Body,
            note.Version,
            note.Category,
            note.IsPublished,
            note.PublishedAt,
            note.CreatedAt,
            note.UpdatedAt);

    private static DevelopmentMutationResult<DevelopmentSuggestionResponse>? ValidateSuggestion(string? title, string? body)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length < 3)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidTitle,
                ErrorMessage: "Title must be at least 3 characters.");
        }

        if (title.Trim().Length > 180)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidTitle,
                ErrorMessage: "Title must be 180 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(body) || body.Trim().Length < 10)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidBody,
                ErrorMessage: "Body must be at least 10 characters.");
        }

        if (body.Trim().Length > 5000)
        {
            return new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                DevelopmentMutationStatus.InvalidBody,
                ErrorMessage: "Body must be 5000 characters or fewer.");
        }

        return null;
    }

    private static DevelopmentMutationResult<DevelopmentNoteResponse>? ValidateNote(string? title, string? body, string? category)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length < 3)
        {
            return new DevelopmentMutationResult<DevelopmentNoteResponse>(
                DevelopmentMutationStatus.InvalidTitle,
                ErrorMessage: "Title must be at least 3 characters.");
        }

        if (title.Trim().Length > 180)
        {
            return new DevelopmentMutationResult<DevelopmentNoteResponse>(
                DevelopmentMutationStatus.InvalidTitle,
                ErrorMessage: "Title must be 180 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(body) || body.Trim().Length < 10)
        {
            return new DevelopmentMutationResult<DevelopmentNoteResponse>(
                DevelopmentMutationStatus.InvalidBody,
                ErrorMessage: "Body must be at least 10 characters.");
        }

        if (body.Trim().Length > 8000)
        {
            return new DevelopmentMutationResult<DevelopmentNoteResponse>(
                DevelopmentMutationStatus.InvalidBody,
                ErrorMessage: "Body must be 8000 characters or fewer.");
        }

        if (string.IsNullOrWhiteSpace(category) || category.Trim().Length > 64)
        {
            return new DevelopmentMutationResult<DevelopmentNoteResponse>(
                DevelopmentMutationStatus.InvalidCategory,
                ErrorMessage: "Category is required and must be 64 characters or fewer.");
        }

        return null;
    }

    private static string NormalizeIssueState(string? state)
    {
        var normalized = state?.Trim().ToLowerInvariant();
        return normalized is "open" or "closed" or "all" ? normalized : "open";
    }

    private static string BuildPromotedIssueBody(string body, DevelopmentSuggestion suggestion, string profileUrl)
    {
        var author = suggestion.User.DisplayName ?? suggestion.User.Username;
        return $"""
{body}

---
Promoted from JassSpace development suggestion.

Suggestion ID: {suggestion.Id}
Submitted by: {author}
JassSpace profile: {profileUrl}
Submitted at: {suggestion.CreatedAt:O}
""";
    }

    private async Task SendPromotionEmailAsync(
        DevelopmentSuggestion suggestion,
        string issueTitle,
        DevelopmentIssueResponse issue,
        string profileUrl,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (!suggestion.User.EmailVerified || !suggestion.User.IsActive || suggestion.User.DeletedAt is not null)
        {
            _logger.LogInformation(
                "Skipping promotion email for suggestion {SuggestionId}; user {UserId} is not eligible.",
                suggestion.Id,
                suggestion.UserId);
            return;
        }

        try
        {
            var recipientName = GetUserDisplayName(suggestion.User);
            var subject = $"Your JassSpace suggestion is now GitHub issue #{issue.Number}";
            var body = BuildPromotionEmailBody(recipientName, suggestion, issueTitle, issue, profileUrl);

            await _emailService.SendEmailAsync(suggestion.User.Email, subject, body, isHtml: true);

            _logger.LogInformation(
                "Sent promotion email for suggestion {SuggestionId} to user {UserId}.",
                suggestion.Id,
                suggestion.UserId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Suggestion {SuggestionId} was promoted to GitHub issue #{IssueNumber}, but the notification email failed.",
                suggestion.Id,
                issue.Number);
        }
    }

    private static string BuildPromotionEmailBody(
        string recipientName,
        DevelopmentSuggestion suggestion,
        string issueTitle,
        DevelopmentIssueResponse issue,
        string profileUrl)
    {
        var encodedRecipientName = HtmlEncodeSafe(recipientName);
        var encodedSuggestionTitle = HtmlEncodeSafe(suggestion.Title);
        var encodedIssueTitle = HtmlEncodeSafe(issueTitle);
        var encodedIssueUrl = HtmlEncodeSafe(issue.Url);
        var encodedProfileUrl = HtmlEncodeSafe(profileUrl);

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Suggestion Promoted</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 640px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #111827; color: white; padding: 24px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; }}
        .issue {{ background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }}
        .button {{ display: inline-block; background: #2563eb; color: #fff !important; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-weight: 600; }}
        .meta {{ color: #6b7280; font-size: 13px; margin-top: 18px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h2>Your suggestion has been promoted</h2>
        </div>
        <div class='content'>
            <p>Hi {encodedRecipientName},</p>
            <p>Your suggestion has been added to the development tracker, and a live GitHub issue has been raised for it.</p>

            <div class='issue'>
                <p><strong>Suggestion:</strong> {encodedSuggestionTitle}</p>
                <p><strong>GitHub issue #{issue.Number}:</strong> {encodedIssueTitle}</p>
            </div>

            <p>
                <a class='button' href='{encodedIssueUrl}'>View GitHub issue</a>
                <a class='button' href='{encodedProfileUrl}' style='margin-left: 8px; background: #111827;'>View JassSpace profile</a>
            </p>

            <p class='meta'>You are receiving this because you submitted this suggestion on JassSpace.</p>
        </div>
    </div>
</body>
</html>";
    }

    private static string GetUserDisplayName(User user)
        => !string.IsNullOrWhiteSpace(user.DisplayName)
            ? user.DisplayName
            : !string.IsNullOrWhiteSpace(user.FirstName)
                ? user.FirstName
                : user.Username;

    private string BuildUserProfileUrl(string username)
    {
        var baseUrl = (_configuration.GetValue<string>("Frontend:BaseUrl") ?? "http://localhost:3000").TrimEnd('/');
        return $"{baseUrl}/user/{Uri.EscapeDataString(username)}";
    }

    private static string HtmlEncodeSafe(string? value)
        => WebUtility.HtmlEncode(value ?? string.Empty);

    private static string? TryGetObjectString(JsonElement item, string objectName, string propertyName)
    {
        return item.TryGetProperty(objectName, out var nested) && nested.ValueKind == JsonValueKind.Object
            ? GetString(nested, propertyName)
            : null;
    }

    private static string? GetString(JsonElement item, string propertyName)
    {
        return item.TryGetProperty(propertyName, out var value) && value.ValueKind is not JsonValueKind.Null
            ? value.GetString()
            : null;
    }

    private static int GetInt(JsonElement item, string propertyName)
        => item.TryGetProperty(propertyName, out var value) && value.TryGetInt32(out var result) ? result : 0;

    private static long GetLong(JsonElement item, string propertyName)
        => item.TryGetProperty(propertyName, out var value) && value.TryGetInt64(out var result) ? result : 0;

    private static bool GetBool(JsonElement item, string propertyName)
        => item.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.True;

    private static DateTimeOffset? GetDate(JsonElement item, string propertyName)
    {
        var value = GetString(item, propertyName);
        return DateTimeOffset.TryParse(value, out var parsed) ? parsed : null;
    }

    private static string ExtractGitHubErrorMessage(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            return "No error details returned.";
        }

        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;
            if (root.TryGetProperty("message", out var messageElement) &&
                messageElement.ValueKind == JsonValueKind.String)
            {
                return messageElement.GetString() ?? "No error details returned.";
            }
        }
        catch (JsonException)
        {
            // Fall through to a short raw response. GitHub normally returns JSON.
        }

        return responseBody.Length > 240 ? $"{responseBody[..240]}..." : responseBody;
    }
}
