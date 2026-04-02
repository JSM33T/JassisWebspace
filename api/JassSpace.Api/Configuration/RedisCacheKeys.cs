namespace JassSpace.Api.Configuration;

public static class RedisCacheKeys
{
    public const string Prefix = "jassspace_";

    public const string BlogCategory = Prefix + "blogcategory";
    public const string BlogList = Prefix + "bloglist";
    public const string BlogSeo = Prefix + "blogseo";
    public const string GallerySeo = Prefix + "galleryseo";
    public const string MusicSeo = Prefix + "musicseo";
    public const string UiProperties = Prefix + "uiproperties";
}
