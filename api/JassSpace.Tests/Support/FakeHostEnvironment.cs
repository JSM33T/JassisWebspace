using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace JassSpace.tests.Support;

public sealed class FakeHostEnvironment : IHostEnvironment
{
    public string EnvironmentName { get; set; } = "Testing";
    public string ApplicationName { get; set; } = "JassSpace.tests";
    public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
}
