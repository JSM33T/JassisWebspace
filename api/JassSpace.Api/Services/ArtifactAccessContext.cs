using JassSpace.Api.Logging;
using JassSpace.Contracts.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace JassSpace.Api.Services;

public sealed class ArtifactAccessContext(IHttpContextAccessor accessor) : IArtifactAccessContext
{
    public Guid? UserId => Guid.TryParse(RequestLoggingContext.TryGetUserId(accessor.HttpContext?.User), out var id) ? id : null;
    public bool IsAdmin => accessor.HttpContext?.User.IsInRole("admin") == true;
    public bool CanManage => IsAdmin || accessor.HttpContext?.User.IsInRole("mod") == true;
}

public sealed class ArtifactTokenProtector(IDataProtectionProvider provider) : IArtifactTokenProtector
{
    private readonly IDataProtector protector = provider.CreateProtector("JassSpace.ArtifactDownloadReplay.v1");
    public string Protect(string token) => protector.Protect(token);
    public string Unprotect(string protectedToken) => protector.Unprotect(protectedToken);
}
