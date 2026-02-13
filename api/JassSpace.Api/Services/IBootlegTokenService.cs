namespace JassSpace.Api.Services;

public interface IBootlegTokenService
{
    string CreateToken(string blobName, TimeSpan ttl);
    bool TryValidateToken(string token, string expectedBlobName, out string? reason);
}
