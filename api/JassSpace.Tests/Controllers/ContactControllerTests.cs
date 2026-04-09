using JassSpace.Api.Configuration;
using JassSpace.Api.Controllers;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Tests.Controllers;

public sealed class ContactControllerTests
{
    [Fact]
    public async Task CreateContact_LogsTurnstileFailureWithoutEmail()
    {
        var logger = new TestLogger<ContactController>();
        var controller = CreateController(
            contactService: new FakeContactService(),
            turnstileService: new FakeTurnstileVerificationService(
                (_, _, _) => Task.FromResult(new TurnstileVerificationResult(false, ["invalid-input-response"]))),
            logger: logger);
        var request = new CreateContactRequest("Jassi", "person@example.com", "support", "hello", null, "bad-token");

        var result = await controller.CreateContact(request);

        Assert.IsType<ObjectResult>(result);
        Assert.Contains(logger.Entries, entry => entry.Level == Microsoft.Extensions.Logging.LogLevel.Warning);
        Assert.DoesNotContain("person@example.com", string.Join(Environment.NewLine, logger.Entries.Select(e => e.Message)), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateContact_LogsSuccessWithoutEmail()
    {
        var logger = new TestLogger<ContactController>();
        var controller = CreateController(
            contactService: new FakeContactService
            {
                CreateHandler = (_, _) => Task.FromResult(
                    new ContactCreateResult(
                        ContactCreateStatus.Success,
                        new ContactResponse(Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"), DateTimeOffset.UtcNow)))
            },
            turnstileService: new FakeTurnstileVerificationService((_, _, _) => Task.FromResult(TurnstileVerificationResult.Passed)),
            logger: logger);
        var request = new CreateContactRequest("Jassi", "person@example.com", "support", "hello", null, "ok-token");

        var result = await controller.CreateContact(request);

        Assert.IsType<CreatedResult>(result);
        Assert.Contains(logger.Entries, entry => entry.Level == Microsoft.Extensions.Logging.LogLevel.Information);
        Assert.DoesNotContain("person@example.com", string.Join(Environment.NewLine, logger.Entries.Select(e => e.Message)), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateContact_LogsErrorWithoutEmail()
    {
        var logger = new TestLogger<ContactController>();
        var controller = CreateController(
            contactService: new FakeContactService
            {
                CreateHandler = (_, _) => throw new InvalidOperationException("boom")
            },
            turnstileService: new FakeTurnstileVerificationService((_, _, _) => Task.FromResult(TurnstileVerificationResult.Passed)),
            logger: logger);
        var request = new CreateContactRequest("Jassi", "person@example.com", "support", "hello", null, "ok-token");

        var result = await controller.CreateContact(request);

        Assert.IsType<ObjectResult>(result);
        Assert.Contains(logger.Entries, entry => entry.Level == Microsoft.Extensions.Logging.LogLevel.Error);
        Assert.DoesNotContain("person@example.com", string.Join(Environment.NewLine, logger.Entries.Select(e => e.Message)), StringComparison.OrdinalIgnoreCase);
    }

    private static ContactController CreateController(
        IContactService contactService,
        ITurnstileVerificationService turnstileService,
        TestLogger<ContactController> logger)
    {
        var controller = new ContactController(
            contactService,
            turnstileService,
            Options.Create(new TurnstileOptions()),
            logger);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return controller;
    }

    private sealed class FakeContactService : IContactService
    {
        public Func<CreateContactRequest, CancellationToken, Task<ContactCreateResult>> CreateHandler { get; set; }
            = (_, _) => Task.FromResult(new ContactCreateResult(ContactCreateStatus.InvalidMessage, ErrorMessage: "not configured"));

        public Task<ContactCreateResult> CreateContactAsync(CreateContactRequest request, CancellationToken cancellationToken = default)
            => CreateHandler(request, cancellationToken);

        public Task<(IReadOnlyCollection<AdminContactMessageResponse> Items, int Page, int PageSize, int Total)> GetMessagesAsync(string? search, int page = 1, int pageSize = 20, CancellationToken cancellationToken = default)
            => Task.FromResult(((IReadOnlyCollection<AdminContactMessageResponse>)Array.Empty<AdminContactMessageResponse>(), page, pageSize, 0));

        public Task<ContactDeleteResult> DeleteMessageAsync(Guid id, CancellationToken cancellationToken = default)
            => Task.FromResult(new ContactDeleteResult(ContactDeleteStatus.NotFound));
    }

    private sealed class FakeTurnstileVerificationService : ITurnstileVerificationService
    {
        private readonly Func<string?, string?, CancellationToken, Task<TurnstileVerificationResult>> _handler;

        public FakeTurnstileVerificationService(Func<string?, string?, CancellationToken, Task<TurnstileVerificationResult>> handler)
        {
            _handler = handler;
        }

        public Task<TurnstileVerificationResult> VerifyAsync(string? token, string? remoteIpAddress, CancellationToken cancellationToken = default)
            => _handler(token, remoteIpAddress, cancellationToken);
    }
}
