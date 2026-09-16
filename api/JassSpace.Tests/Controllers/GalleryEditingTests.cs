using System.Reflection;
using JassSpace.Api.Controllers;
using JassSpace.Api.Controllers.Admin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace JassSpace.Tests.Controllers;

public sealed class GalleryEditingTests
{
    [Fact]
    public void EveryGalleryWriteRequiresAdmin()
    {
        Assert.Equal("admin", typeof(AdminGalleryController).GetCustomAttribute<AuthorizeAttribute>()?.Roles);
        foreach (var method in typeof(GalleryController).GetMethods()
            .Where(m => m.GetCustomAttribute<HttpPostAttribute>() is not null))
            Assert.Equal("admin", method.GetCustomAttribute<AuthorizeAttribute>()?.Roles);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(26 * 1024 * 1024)]
    public async Task ReplacementRejectsEmptyAndOversizedFilesBeforeCallingService(long length)
    {
        var controller = new AdminGalleryController(null!,
            NullLogger<AdminGalleryController>.Instance, null!)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        using var stream = new MemoryStream();
        var file = new FormFile(stream, 0, length, "imageFile", "image.png");
        var result = Assert.IsAssignableFrom<ObjectResult>(await controller.ReplaceImage(Guid.NewGuid(), file));
        Assert.Equal(StatusCodes.Status400BadRequest, result.StatusCode);
    }
}
