using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class UiPropertiesService(JassSpaceDbContext dbContext) : IUiPropertiesService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<IReadOnlyCollection<UiPropertyResponse>> GetUiPropertiesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.UiProperties
            .AsNoTracking()
            .OrderBy(p => p.Key)
            .Select(p => new UiPropertyResponse(
                p.Id,
                p.Key,
                p.Value,
                p.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<UiPropertyResponse?> GetUiPropertyAsync(string key, CancellationToken cancellationToken = default)
    {
        var normalizedKey = NormalizeKey(key);
        if (normalizedKey is null)
        {
            return null;
        }

        return await _dbContext.UiProperties
            .AsNoTracking()
            .Where(p => p.Key == normalizedKey)
            .Select(p => new UiPropertyResponse(
                p.Id,
                p.Key,
                p.Value,
                p.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<UiPropertyUpsertResult> SetUiPropertyAsync(
        string key,
        SetUiPropertyRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedKey = NormalizeKey(key);
        if (normalizedKey is null)
        {
            return new UiPropertyUpsertResult(
                UiPropertyUpsertStatus.InvalidKey,
                ErrorMessage: "The property key is required.");
        }

        if (request.Value is null)
        {
            return new UiPropertyUpsertResult(
                UiPropertyUpsertStatus.InvalidValue,
                ErrorMessage: "The property value is required.");
        }

        var property = await _dbContext.UiProperties
            .FirstOrDefaultAsync(p => p.Key == normalizedKey, cancellationToken);

        if (property is null)
        {
            property = new UiProperties
            {
                Id = Guid.NewGuid(),
                Key = normalizedKey,
                Value = request.Value,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            _dbContext.UiProperties.Add(property);
        }
        else
        {
            property.Value = request.Value;
            property.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new UiPropertyUpsertResult(
            UiPropertyUpsertStatus.Success,
            new UiPropertyResponse(
                property.Id,
                property.Key,
                property.Value,
                property.UpdatedAt));
    }

    private static string? NormalizeKey(string? key)
    {
        var normalized = key?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }
}
