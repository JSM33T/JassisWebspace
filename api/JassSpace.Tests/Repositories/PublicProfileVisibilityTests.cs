using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace JassSpace.Tests.Repositories;

public sealed class PublicProfileVisibilityTests
{
    [Theory]
    [InlineData(true, false, true)]
    [InlineData(false, false, false)]
    [InlineData(true, true, false)]
    [InlineData(false, true, false)]
    public async Task PublicLookups_OnlyReturnActiveNonDeletedUsers(
        bool isActive, bool isDeleted, bool shouldBeVisible)
    {
        await using var db = CreateDb();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "SampleUser",
            Email = "sample@example.test",
            PasswordHash = "unused-test-hash",
            Bio = "Public biography",
            IsActive = isActive,
            DeletedAt = isDeleted ? DateTimeOffset.UtcNow : null,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var profileRepository = CreateProfileRepository(db);
        var userRepository = new UserRepository(db, NullLogger<UserRepository>.Instance);

        // Both public entry points must enforce the same visibility rules,
        // including when the username differs in case or has surrounding spaces.
        var profile = await profileRepository.GetPublicProfileByUsernameAsync(" sampleUSER ");
        var publicUser = await userRepository.GetPublicByUsernameAsync(" sampleUSER ");

        if (shouldBeVisible)
        {
            Assert.NotNull(profile);
            Assert.NotNull(publicUser);
            Assert.Equal(user.Id, profile.Id);
            Assert.Equal(user.Id, publicUser.Id);
            Assert.Equal(user.Bio, profile.Bio);
            Assert.Equal(user.Bio, publicUser.Bio);
        }
        else
        {
            Assert.Null(profile);
            Assert.Null(publicUser);
        }
    }

    [Fact]
    public async Task PublicLookups_ReturnNullForUnknownUsername()
    {
        await using var db = CreateDb();

        Assert.Null(await CreateProfileRepository(db).GetPublicProfileByUsernameAsync("missing"));
        Assert.Null(await new UserRepository(db, NullLogger<UserRepository>.Instance)
            .GetPublicByUsernameAsync("missing"));
    }

    private static ProfileRepository CreateProfileRepository(JassSpaceDbContext db) =>
        new(db, NullLogger<ProfileRepository>.Instance, new ConfigurationBuilder().Build());

    private static JassSpaceDbContext CreateDb() =>
        new(new DbContextOptionsBuilder<JassSpaceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options);
}
