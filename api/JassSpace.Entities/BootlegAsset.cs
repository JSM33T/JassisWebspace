namespace JassSpace.Entities;

public class BootlegAsset
{
    public Guid Id { get; set; }
    public required string Folder { get; set; }
    public required string BlobName { get; set; }
    public required string OriginalFileName { get; set; }
    public required string ContentType { get; set; }
    public long SizeBytes { get; set; }
    public Guid? UploadedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
