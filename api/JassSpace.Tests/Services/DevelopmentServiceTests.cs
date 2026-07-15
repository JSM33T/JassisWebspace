using System.Net;
using System.Text.Json;
using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using JassSpace.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JassSpace.Tests.Services;

public sealed class DevelopmentServiceTests
{
    [Fact]
    public async Task GetIssuesAsync_MapsGitHubStateReason()
    {
        await using var dbContext = CreateDbContext();
        using var handler = new RecordingGitHubHandler(
            """
            [
              {
                "number": 42,
                "title": "Finished issue",
                "state": "closed",
                "state_reason": "completed",
                "html_url": "https://github.com/JSM33T/JassisWebspace/issues/42",
                "body": "Done",
                "labels": [],
                "created_at": "2026-07-15T00:00:00Z",
                "updated_at": "2026-07-15T01:00:00Z",
                "closed_at": "2026-07-15T02:00:00Z"
              }
            ]
            """);
        var service = CreateService(dbContext, handler);

        var issues = await service.GetIssuesAsync("closed", null, null, null);

        var issue = Assert.Single(issues);
        Assert.Equal("closed", issue.State);
        Assert.Equal("completed", issue.StateReason);
    }

    [Fact]
    public async Task ClosePromotedIssueAsync_ClosesGitHubIssueAsCompleted()
    {
        await using var dbContext = CreateDbContext();
        var reviewerId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        var suggestion = CreatePromotedSuggestion();
        dbContext.Users.Add(suggestion.User);
        dbContext.DevelopmentSuggestions.Add(suggestion);
        await dbContext.SaveChangesAsync();

        using var handler = new RecordingGitHubHandler();
        var service = CreateService(dbContext, handler);

        var result = await service.ClosePromotedIssueAsync(suggestion.Id, reviewerId);

        Assert.Equal(DevelopmentMutationStatus.Success, result.Status);
        Assert.Equal(DevelopmentSuggestionStatuses.Archived, result.Response?.Status);
        Assert.Equal(HttpMethod.Patch, handler.RequestMethod);
        Assert.Equal("https://api.github.com/repos/JSM33T/JassisWebspace/issues/42", handler.RequestUri?.ToString());

        using var payload = JsonDocument.Parse(handler.RequestBody ?? "{}");
        Assert.Equal("closed", payload.RootElement.GetProperty("state").GetString());
        Assert.Equal("completed", payload.RootElement.GetProperty("state_reason").GetString());
        Assert.False((handler.RequestBody ?? string.Empty).Contains("not_planned", StringComparison.OrdinalIgnoreCase));

        var storedSuggestion = await dbContext.DevelopmentSuggestions.SingleAsync(s => s.Id == suggestion.Id);
        Assert.Equal(DevelopmentSuggestionStatuses.Archived, storedSuggestion.Status);
        Assert.Equal(reviewerId, storedSuggestion.ReviewedByUserId);
    }

    private static JassSpaceDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<JassSpaceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new JassSpaceDbContext(options);
    }

    private static DevelopmentService CreateService(
        JassSpaceDbContext dbContext,
        HttpMessageHandler handler)
    {
        var options = Options.Create(new DevelopmentGitHubOptions
        {
            Owner = "JSM33T",
            Repository = "JassisWebspace",
            Token = "test-token",
            CacheMinutes = 0
        });

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Frontend:BaseUrl"] = "https://jassspace.example"
            })
            .Build();

        return new DevelopmentService(
            dbContext,
            new HttpClient(handler),
            new MemoryCache(new MemoryCacheOptions()),
            options,
            new NoopEmailService(),
            configuration,
            NullLogger<DevelopmentService>.Instance);
    }

    private static DevelopmentSuggestion CreatePromotedSuggestion()
    {
        var userId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var now = DateTimeOffset.UtcNow;
        return new DevelopmentSuggestion
        {
            Id = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            UserId = userId,
            Title = "Add better issue close reasons",
            Body = "Close promoted GitHub issues as completed.",
            Status = DevelopmentSuggestionStatuses.Promoted,
            GitHubIssueNumber = 42,
            GitHubIssueUrl = "https://github.com/JSM33T/JassisWebspace/issues/42",
            CreatedAt = now,
            UpdatedAt = now,
            User = new User
            {
                Id = userId,
                Email = "tester@example.com",
                PasswordHash = "hash",
                Username = "tester",
                DisplayName = "Tester",
                CreatedAt = now,
                UpdatedAt = now
            }
        };
    }

    private sealed class RecordingGitHubHandler : HttpMessageHandler
    {
        private readonly string _responseBody;

        public RecordingGitHubHandler(string responseBody = "{}")
        {
            _responseBody = responseBody;
        }

        public HttpMethod? RequestMethod { get; private set; }
        public Uri? RequestUri { get; private set; }
        public string? RequestBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestMethod = request.Method;
            RequestUri = request.RequestUri;
            RequestBody = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(_responseBody)
            };
        }
    }

    private sealed class NoopEmailService : IEmailService
    {
        public Task SendEmailAsync(string to, string subject, string body, bool isHtml = true, string[]? bcc = null)
            => Task.CompletedTask;

        public Task SendVerificationEmailAsync(string to, string firstName, string verificationCode)
            => Task.CompletedTask;

        public Task SendPasswordResetEmailAsync(string to, string firstName, string resetCode)
            => Task.CompletedTask;

        public Task SendWelcomeEmailAsync(string to, string firstName)
            => Task.CompletedTask;

        public Task SendCommentNotificationEmailAsync(CommentNotificationEmailModel model)
            => Task.CompletedTask;
    }
}
