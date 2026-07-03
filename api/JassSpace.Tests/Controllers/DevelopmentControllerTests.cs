using System.Security.Claims;
using JassSpace.Api.Controllers;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Tests.Controllers;

public sealed class DevelopmentControllerTests
{
    private static readonly Guid UserId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    [Fact]
    public async Task CreateSuggestion_WhenTitleInvalid_ReturnsBadRequest()
    {
        var controller = CreatePublicController(new FakeDevelopmentService
        {
            CreateSuggestionHandler = (_, _, _) => Task.FromResult(
                new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                    DevelopmentMutationStatus.InvalidTitle,
                    ErrorMessage: "Title must be at least 3 characters."))
        });

        var result = await controller.CreateSuggestion(new CreateDevelopmentSuggestionRequest("x", "This is long enough."));

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
    }

    [Fact]
    public async Task PromoteSuggestion_WhenGitHubUnavailable_ReturnsBadGateway()
    {
        var controller = CreateAdminController(new FakeDevelopmentService
        {
            PromoteSuggestionHandler = (_, _, _, _) => Task.FromResult(
                new DevelopmentMutationResult<DevelopmentSuggestionResponse>(
                    DevelopmentMutationStatus.GitHubUnavailable,
                    ErrorMessage: "GitHub token is not configured."))
        });

        var result = await controller.PromoteSuggestion(
            Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            new PromoteDevelopmentSuggestionRequest(null, null));

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, objectResult.StatusCode);
    }

    private static DevelopmentController CreatePublicController(IDevelopmentService service)
    {
        var controller = new DevelopmentController(service, new TestLogger<DevelopmentController>());
        controller.ControllerContext = CreateControllerContext();
        return controller;
    }

    private static AdminDevelopmentController CreateAdminController(IDevelopmentService service)
    {
        var controller = new AdminDevelopmentController(service);
        controller.ControllerContext = CreateControllerContext();
        return controller;
    }

    private static ControllerContext CreateControllerContext()
    {
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, UserId.ToString()),
                    new Claim(ClaimTypes.Role, "admin")
                ],
                "TestAuth"))
        };

        return new ControllerContext { HttpContext = httpContext };
    }

    private sealed class FakeDevelopmentService : IDevelopmentService
    {
        public Func<Guid, CreateDevelopmentSuggestionRequest, CancellationToken, Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>>> CreateSuggestionHandler { get; set; }
            = (_, _, _) => throw new NotImplementedException();

        public Func<Guid, Guid, PromoteDevelopmentSuggestionRequest, CancellationToken, Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>>> PromoteSuggestionHandler { get; set; }
            = (_, _, _, _) => throw new NotImplementedException();

        public Task<DevelopmentSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<IReadOnlyList<DevelopmentIssueResponse>> GetIssuesAsync(
            string? state,
            string? label,
            string? milestone,
            string? search,
            int page = 1,
            int pageSize = 20,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<IReadOnlyList<DevelopmentReleaseResponse>> GetReleasesAsync(
            int page = 1,
            int pageSize = 10,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<IReadOnlyList<DevelopmentSuggestionResponse>> GetPublicSuggestionsAsync(
            int page = 1,
            int pageSize = 20,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> CreateSuggestionAsync(
            Guid userId,
            CreateDevelopmentSuggestionRequest request,
            CancellationToken cancellationToken = default)
            => CreateSuggestionHandler(userId, request, cancellationToken);

        public Task<(IReadOnlyCollection<DevelopmentSuggestionResponse> Items, int Page, int PageSize, int Total)> GetAdminSuggestionsAsync(
            string? status,
            int page = 1,
            int pageSize = 20,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> UpdateSuggestionStatusAsync(
            Guid id,
            Guid reviewedByUserId,
            UpdateDevelopmentSuggestionStatusRequest request,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> UpdateSuggestionAsync(
            Guid id,
            Guid reviewedByUserId,
            UpdateDevelopmentSuggestionRequest request,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> PromoteSuggestionAsync(
            Guid id,
            Guid reviewedByUserId,
            PromoteDevelopmentSuggestionRequest request,
            CancellationToken cancellationToken = default)
            => PromoteSuggestionHandler(id, reviewedByUserId, request, cancellationToken);

        public Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> ClosePromotedIssueAsync(
            Guid id,
            Guid reviewedByUserId,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<bool>> DeleteSuggestionAsync(
            Guid id,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<IReadOnlyList<DevelopmentNoteResponse>> GetNotesAsync(
            bool publicOnly,
            int page = 1,
            int pageSize = 20,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<DevelopmentNoteResponse>> CreateNoteAsync(
            Guid createdByUserId,
            CreateDevelopmentNoteRequest request,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<DevelopmentNoteResponse>> UpdateNoteAsync(
            Guid id,
            UpdateDevelopmentNoteRequest request,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();

        public Task<DevelopmentMutationResult<bool>> DeleteNoteAsync(
            Guid id,
            CancellationToken cancellationToken = default)
            => throw new NotImplementedException();
    }
}
