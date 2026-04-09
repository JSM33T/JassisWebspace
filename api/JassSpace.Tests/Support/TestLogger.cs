using Microsoft.Extensions.Logging;

namespace JassSpace.tests.Support;

public sealed record TestLogEntry(
    LogLevel Level,
    string Message,
    Exception? Exception,
    IReadOnlyDictionary<string, object?> Properties);

public sealed class TestLogger<T> : ILogger<T>
{
    private readonly List<TestLogEntry> _entries = [];

    public IReadOnlyList<TestLogEntry> Entries => _entries;

    public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        var properties = new Dictionary<string, object?>(StringComparer.Ordinal);

        if (state is IEnumerable<KeyValuePair<string, object?>> structuredState)
        {
            foreach (var kvp in structuredState)
            {
                properties[kvp.Key] = kvp.Value;
            }
        }

        _entries.Add(new TestLogEntry(logLevel, formatter(state, exception), exception, properties));
    }

    private sealed class NullScope : IDisposable
    {
        public static readonly NullScope Instance = new();

        public void Dispose()
        {
        }
    }
}
