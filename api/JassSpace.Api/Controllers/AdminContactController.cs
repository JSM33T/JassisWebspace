using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("admin/contact")]
[Authorize(Roles = "admin")]
public sealed class AdminContactController(
    JassSpaceDbContext dbContext)
    : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<AdminContactMessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = dbContext.Contacts.AsNoTracking().AsQueryable();

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

        return PagedOk(items, page, pageSize, total);
    }
}
