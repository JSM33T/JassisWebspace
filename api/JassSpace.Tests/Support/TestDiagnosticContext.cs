using Serilog;

namespace JassSpace.Tests.Support;

public sealed class TestDiagnosticContext : IDiagnosticContext
{
    private readonly Dictionary<string, object?> _values = new(StringComparer.Ordinal);

    public IReadOnlyDictionary<string, object?> Values => _values;

    public void Set(string propertyName, object? value, bool destructureObjects = false)
    {
        _values[propertyName] = value;
    }

    public void SetException(Exception exception)
    {
        _values["Exception"] = exception;
    }
}
