namespace JassSpace.Contracts.Interfaces;

public interface IEmailBroadcastJob
{
    Task ExecuteAsync(Guid templateId, Dictionary<string, string> manualVars, List<Guid> recipientUserIds);
}
