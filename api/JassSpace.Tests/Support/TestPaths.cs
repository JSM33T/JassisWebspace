namespace JassSpace.tests.Support;

public static class TestPaths
{
    public static string ApiProjectFile(string relativePath)
        => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "JassSpace.Api", relativePath));
}
