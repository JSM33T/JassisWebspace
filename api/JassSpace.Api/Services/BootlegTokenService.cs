using System.Security.Cryptography;
using System.Text;
using JassSpace.Api.Configuration;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Services;

public class BootlegTokenService(IOptions<BootlegStreamingSettings> settings) : IBootlegTokenService
{
    private readonly BootlegStreamingSettings _settings = settings.Value;

    public string CreateToken(string blobName, TimeSpan ttl)
    {
        var expiryUnix = DateTimeOffset.UtcNow.Add(ttl).ToUnixTimeSeconds();
        var payload = $"{blobName}|{expiryUnix}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signatureBytes = ComputeSignature(payloadBytes);
        return $"{Base64UrlEncode(payloadBytes)}.{Base64UrlEncode(signatureBytes)}";
    }

    public bool TryValidateToken(string token, string expectedBlobName, out string? reason)
    {
        reason = null;
        if (string.IsNullOrWhiteSpace(token))
        {
            reason = "Missing token.";
            return false;
        }

        var parts = token.Split('.', 2);
        if (parts.Length != 2)
        {
            reason = "Invalid token format.";
            return false;
        }

        byte[] payloadBytes;
        byte[] signatureBytes;
        try
        {
            payloadBytes = Base64UrlDecode(parts[0]);
            signatureBytes = Base64UrlDecode(parts[1]);
        }
        catch
        {
            reason = "Invalid token encoding.";
            return false;
        }

        var expectedSignature = ComputeSignature(payloadBytes);
        if (!CryptographicOperations.FixedTimeEquals(signatureBytes, expectedSignature))
        {
            reason = "Token signature mismatch.";
            return false;
        }

        var payload = Encoding.UTF8.GetString(payloadBytes);
        var payloadParts = payload.Split('|', 2);
        if (payloadParts.Length != 2)
        {
            reason = "Invalid token payload.";
            return false;
        }

        var blobName = payloadParts[0];
        if (!string.Equals(blobName, expectedBlobName, StringComparison.Ordinal))
        {
            reason = "Token scope mismatch.";
            return false;
        }

        if (!long.TryParse(payloadParts[1], out var expiryUnix))
        {
            reason = "Invalid token expiry.";
            return false;
        }

        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiryUnix)
        {
            reason = "Token expired.";
            return false;
        }

        return true;
    }

    private byte[] ComputeSignature(byte[] payloadBytes)
    {
        var keyBytes = Encoding.UTF8.GetBytes(_settings.SigningKey);
        using var hmac = new HMACSHA256(keyBytes);
        return hmac.ComputeHash(payloadBytes);
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value
            .Replace('-', '+')
            .Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }

        return Convert.FromBase64String(padded);
    }
}
