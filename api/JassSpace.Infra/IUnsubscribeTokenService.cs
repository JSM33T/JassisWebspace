namespace JassSpace.Infra;

public interface IUnsubscribeTokenService
{
    string GenerateToken(Guid userId);
    Guid? ValidateToken(string token);
}
