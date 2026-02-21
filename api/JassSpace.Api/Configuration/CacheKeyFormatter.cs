using System.Text;

namespace JassSpace.Api.Configuration;

public static class CacheKeyFormatter
{
    public static string NormalizeSegment(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "default";
        }

        var input = value.Trim().ToLowerInvariant();
        var builder = new StringBuilder(input.Length);
        var previousWasUnderscore = false;

        foreach (var ch in input)
        {
            if (char.IsLetterOrDigit(ch) || ch is '-' or '_')
            {
                builder.Append(ch);
                previousWasUnderscore = false;
                continue;
            }

            if (!previousWasUnderscore)
            {
                builder.Append('_');
                previousWasUnderscore = true;
            }
        }

        var normalized = builder.ToString().Trim('_');
        return string.IsNullOrWhiteSpace(normalized) ? "default" : normalized;
    }
}
