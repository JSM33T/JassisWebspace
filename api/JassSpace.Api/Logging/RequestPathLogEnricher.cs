using Serilog.Core;
using Serilog.Events;

namespace JassSpace.Api.Logging;

// Request logging supplies its own RequestPath property. Override it rather than
// adding a default property, so capability paths cannot survive that enrichment.
internal sealed class RequestPathLogEnricher(string requestPath) : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
        => logEvent.AddOrUpdateProperty(new LogEventProperty("RequestPath", new ScalarValue(requestPath)));
}
