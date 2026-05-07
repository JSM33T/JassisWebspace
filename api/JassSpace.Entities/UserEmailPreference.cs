namespace JassSpace.Entities;

public class UserEmailPreference
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public bool ReceiveBroadcastEmails { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; }
}
