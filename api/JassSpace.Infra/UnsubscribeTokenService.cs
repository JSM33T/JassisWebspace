using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace JassSpace.Infra;

public sealed class UnsubscribeTokenService(IConfiguration configuration) : IUnsubscribeTokenService
{
    private byte[] Key => Encoding.UTF8.GetBytes(
        configuration["JWT:SecretKey"] ?? throw new InvalidOperationException("JWT:SecretKey is not configured."));

    public string GenerateToken(Guid userId)
    {
        var payload = userId.ToString();
        var sig = Sign(payload);
        return $"{Base64UrlEncode(payload)}.{Base64UrlEncode(sig)}";
    }

    public Guid? ValidateToken(string token)
    {
        var parts = token.Split('.');
        if (parts.Length != 2) return null;

        try
        {
            var payload = Base64UrlDecode(parts[0]);
            var providedSig = Base64UrlDecode(parts[1]);
            var expectedSig = Sign(payload);

            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(providedSig),
                    Encoding.UTF8.GetBytes(expectedSig)))
                return null;

            return Guid.TryParse(payload, out var id) ? id : null;
        }
        catch
        {
            return null;
        }
    }

    private string Sign(string payload)
    {
        var data = Encoding.UTF8.GetBytes("unsub:" + payload);
        var hash = HMACSHA256.HashData(Key, data);
        return Convert.ToHexString(hash);
    }

    private static string Base64UrlEncode(string value)
        => Convert.ToBase64String(Encoding.UTF8.GetBytes(value))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded = padded.PadRight(padded.Length + (4 - padded.Length % 4) % 4, '=');
        return Encoding.UTF8.GetString(Convert.FromBase64String(padded));
    }
}
