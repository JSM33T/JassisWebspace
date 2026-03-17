using System.Text.RegularExpressions;

namespace JassSpace.Api.Services;

public sealed partial class SiteFeatureProbeService : ISiteFeatureProbeService
{
    private const int MatchThreshold = 24;

    private static readonly string[] OverviewPhrases =
    [
        "what features",
        "which features",
        "available features",
        "public features",
        "what can i do",
        "what can users do",
        "what is available",
        "what all features",
        "all features",
        "site features"
    ];

    private static readonly string[] FeatureSignals =
    [
        "can i",
        "do you have",
        "does",
        "is there",
        "support",
        "available",
        "feature",
        "features",
        "how do i",
        "how does",
        "where can i",
        "what can i",
        "what can users do"
    ];

    private static readonly FeatureDefinition[] FeatureCatalog =
    [
        new(
            "comment-reactions",
            10,
            "Like or upvote comments",
            "Not available",
            "Liking or upvoting individual comments is not supported right now.",
            [
                "There is no public comment reaction button in the current UI.",
                "Comment interactions currently cover posting, replying, editing, and deleting your own comments.",
                "Likes are available on blog posts, music tracks, and gallery albums instead."
            ],
            [
                new SiteFeatureLink("Blogs", "/blog"),
                new SiteFeatureLink("Music", "/music"),
                new SiteFeatureLink("Gallery", "/gallery")
            ],
            [
                "like comments",
                "like comment",
                "comment like",
                "comment likes",
                "upvote comments",
                "upvote comment",
                "comment reaction",
                "react to comments",
                "heart comments"
            ],
            ["comment", "comments", "like", "likes", "upvote", "reaction", "react"]),
        new(
            "comments",
            20,
            "Comments on published content",
            "Available",
            "Comments are available on published blog posts, music tracks, and gallery albums.",
            [
                "Logged-in users can post, reply to, edit, and delete their own comments.",
                "Comment threads are nested.",
                "Unpublished blog posts disable likes and comments."
            ],
            [
                new SiteFeatureLink("Blogs", "/blog"),
                new SiteFeatureLink("Music", "/music"),
                new SiteFeatureLink("Gallery", "/gallery")
            ],
            [
                "leave a comment",
                "post comment",
                "comment feature",
                "comments feature",
                "comment section",
                "comments section",
                "can i comment",
                "reply to comments",
                "reply comments",
                "edit comment",
                "delete comment",
                "comment thread",
                "comment threads"
            ],
            ["comment", "comments", "reply", "replies", "thread", "threads", "discussion"]),
        new(
            "content-likes",
            30,
            "Likes on posts, tracks, and albums",
            "Available",
            "Logged-in users can like blog posts, music tracks, and gallery albums.",
            [
                "The like button is attached to the content item, not to individual comments.",
                "Like counts sync from the backend.",
                "Login is required before toggling a like."
            ],
            [
                new SiteFeatureLink("Blogs", "/blog"),
                new SiteFeatureLink("Music", "/music"),
                new SiteFeatureLink("Gallery", "/gallery")
            ],
            [
                "like blog posts",
                "like blogs",
                "like music",
                "like tracks",
                "like gallery",
                "like album",
                "like post"
            ],
            ["like", "likes", "heart", "liked", "blog", "music", "track", "gallery", "album"]),
        new(
            "blogs",
            40,
            "Published blog pages",
            "Available",
            "Published blog posts can be browsed from the blog listing and opened on dedicated article pages.",
            [
                "Blog pages show reading time, category, author details, likes, and comments.",
                "Author details can be opened from the article page.",
                "There is a public blog listing plus per-post pages."
            ],
            [new SiteFeatureLink("Blog", "/blog")],
            [
                "read blogs",
                "blog page",
                "blog pages",
                "blog articles",
                "published blogs"
            ],
            ["blog", "blogs", "article", "articles", "post", "posts"]),
        new(
            "gallery",
            50,
            "Public gallery albums",
            "Available",
            "Public gallery albums can be browsed from the gallery page and opened on dedicated album pages.",
            [
                "Album pages show images, album details, likes, and comments.",
                "Only active albums are shown publicly.",
                "Gallery items are grouped into albums."
            ],
            [new SiteFeatureLink("Gallery", "/gallery")],
            [
                "gallery page",
                "gallery albums",
                "photo gallery",
                "image gallery",
                "album page"
            ],
            ["gallery", "galleries", "album", "albums", "photo", "photos", "image", "images"]),
        new(
            "music",
            60,
            "Music pages and playback",
            "Available",
            "Music tracks can be browsed on the music page and opened on dedicated track pages.",
            [
                "Playback is available through the music player and sidebar controls.",
                "Track pages support likes and comments.",
                "The sidebar includes shared player controls."
            ],
            [new SiteFeatureLink("Music", "/music")],
            [
                "music player",
                "play music",
                "track page",
                "listen to tracks",
                "audio player",
                "sidebar player"
            ],
            ["music", "track", "tracks", "song", "songs", "player", "audio", "playback", "listen"]),
        new(
            "auth",
            70,
            "Authentication and sign-in",
            "Available",
            "Visitors can sign up, log in, verify email, reset passwords, and use supported OAuth providers.",
            [
                "Email/password login and signup are available.",
                "Google and GitHub sign-in are supported.",
                "Forgot-password, email verification, and recovery flows are available."
            ],
            [
                new SiteFeatureLink("Login", "/login"),
                new SiteFeatureLink("Signup", "/signup"),
                new SiteFeatureLink("Forgot password", "/forgot-password")
            ],
            [
                "sign in",
                "sign up",
                "log in",
                "how do i login",
                "how can i login",
                "how to login",
                "how do i sign in",
                "create an account",
                "create account",
                "make an account",
                "make account",
                "login",
                "signup",
                "register",
                "forgot password",
                "password reset",
                "verify email",
                "google login",
                "github login"
            ],
            ["login", "signup", "register", "oauth", "google", "github", "password", "email", "verify", "recovery"]),
        new(
            "account",
            80,
            "Account profile, preferences, and security",
            "Available after login",
            "Signed-in users can manage their profile, preferences, and security settings.",
            [
                "Profile management includes avatar, cover, and bio fields.",
                "Preferences and security have dedicated account pages.",
                "These areas require the user to be signed in."
            ],
            [
                new SiteFeatureLink("Profile", "/account/profile"),
                new SiteFeatureLink("Preferences", "/account/preferences"),
                new SiteFeatureLink("Security", "/account/security")
            ],
            [
                "account settings",
                "profile settings",
                "security settings",
                "edit profile",
                "preferences page"
            ],
            ["account", "profile", "preferences", "security", "avatar", "bio", "settings"]),
        new(
            "public-profiles",
            90,
            "Public profile details from authors and commenters",
            "Available",
            "Author and commenter profile details can be opened from the public UI.",
            [
                "Blog author details can be opened from article pages.",
                "Comment authors can be opened from the comment UI.",
                "This is for viewing public profile details, not full account editing."
            ],
            [new SiteFeatureLink("Blog", "/blog")],
            [
                "author profile",
                "user profile",
                "comment profile",
                "public profile"
            ],
            ["author", "profile", "profiles", "user", "commenter"]),
        new(
            "contact-support",
            100,
            "Contact, FAQ, and support chat",
            "Available",
            "Visitors can use the contact page, the FAQ page, and the floating support chat.",
            [
                "The contact page submits messages through the site.",
                "There is a public FAQ page and a privacy page.",
                "The support chat is available site-wide from the floating bot."
            ],
            [
                new SiteFeatureLink("Contact", "/contact"),
                new SiteFeatureLink("FAQ", "/faq"),
                new SiteFeatureLink("Privacy", "/privacy")
            ],
            [
                "contact page",
                "contact form",
                "support chat",
                "chat bot",
                "bot chat",
                "faq page",
                "privacy page"
            ],
            ["contact", "support", "chat", "bot", "faq", "privacy", "help"]),
        new(
            "theme-player",
            110,
            "Theme and sidebar controls",
            "Available",
            "The public site supports light mode, dark mode, theme sets, and sidebar music controls.",
            [
                "Light and dark mode are available.",
                "Theme sets can be switched from the sidebar.",
                "The sidebar also exposes shared music player controls."
            ],
            [new SiteFeatureLink("Home", "/")],
            [
                "dark mode",
                "light mode",
                "theme set",
                "theme sets",
                "appearance settings",
                "sidebar controls"
            ],
            ["theme", "themes", "dark", "light", "appearance", "sidebar", "mode"]),
        new(
            "projects-services",
            120,
            "Projects and services pages",
            "Available",
            "The site has public pages for projects and services.",
            [
                "Projects has a dedicated public page.",
                "Services has a dedicated public page.",
                "These areas are separate from blogs, gallery, and music."
            ],
            [
                new SiteFeatureLink("Projects", "/projects"),
                new SiteFeatureLink("Services", "/services")
            ],
            [
                "projects page",
                "services page",
                "portfolio projects"
            ],
            ["projects", "services", "portfolio"])
    ];

    private static readonly FeatureDefinition[] OverviewFeatures =
    [
        FeatureCatalog.Single(feature => feature.Id == "blogs"),
        FeatureCatalog.Single(feature => feature.Id == "gallery"),
        FeatureCatalog.Single(feature => feature.Id == "music"),
        FeatureCatalog.Single(feature => feature.Id == "comments"),
        FeatureCatalog.Single(feature => feature.Id == "content-likes"),
        FeatureCatalog.Single(feature => feature.Id == "comment-reactions"),
        FeatureCatalog.Single(feature => feature.Id == "auth"),
        FeatureCatalog.Single(feature => feature.Id == "account"),
        FeatureCatalog.Single(feature => feature.Id == "contact-support"),
        FeatureCatalog.Single(feature => feature.Id == "theme-player"),
        FeatureCatalog.Single(feature => feature.Id == "projects-services")
    ];

    public SiteFeatureProbeResult Probe(string query)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);

        var normalizedQuery = NormalizeForMatching(query);
        if (string.IsNullOrWhiteSpace(normalizedQuery))
        {
            return new SiteFeatureProbeResult(false, false, false, query.Trim(), []);
        }

        if (IsOverviewQuery(normalizedQuery))
        {
            return new SiteFeatureProbeResult(
                true,
                true,
                true,
                query.Trim(),
                OverviewFeatures.Select(ToMatch).ToList());
        }

        var looksLikeFeatureQuery = LooksLikeFeatureQuery(normalizedQuery);

        var rankedMatches = FeatureCatalog
            .Select(feature => new RankedFeature(feature, ScoreFeature(feature, normalizedQuery, looksLikeFeatureQuery)))
            .Where(result => result.Score >= MatchThreshold)
            .OrderByDescending(result => result.Score)
            .ThenBy(result => result.Feature.Order)
            .Take(3)
            .Select(result => ToMatch(result.Feature))
            .ToList();

        if (rankedMatches.Count > 0)
        {
            return new SiteFeatureProbeResult(true, true, false, query.Trim(), rankedMatches);
        }

        if (!looksLikeFeatureQuery)
        {
            return new SiteFeatureProbeResult(false, false, false, query.Trim(), []);
        }

        return new SiteFeatureProbeResult(
            true,
            false,
            false,
            query.Trim(),
            []);
    }

    private static bool IsOverviewQuery(string normalizedQuery)
    {
        var tokens = Tokenize(normalizedQuery);
        var mentionsFeatures = tokens.Contains("feature") || tokens.Contains("features");
        var mentionsAvailability = tokens.Contains("available") || tokens.Contains("public") || tokens.Contains("all");

        return OverviewPhrases.Any(normalizedQuery.Contains)
            || (mentionsFeatures && mentionsAvailability);
    }

    private static bool LooksLikeFeatureQuery(string normalizedQuery)
    {
        if (IsOverviewQuery(normalizedQuery))
        {
            return true;
        }

        var tokens = Tokenize(normalizedQuery);
        var hasSignal = FeatureSignals.Any(normalizedQuery.Contains);
        var topicHits = FeatureCatalog
            .Select(feature => CountTopicHits(feature, normalizedQuery, tokens))
            .Max();

        return (hasSignal && topicHits > 0) || topicHits >= 2;
    }

    private static int ScoreFeature(
        FeatureDefinition feature,
        string normalizedQuery,
        IReadOnlySet<string> queryTokens,
        bool looksLikeFeatureQuery)
    {
        var score = 0;

        foreach (var phrase in feature.MatchPhrases)
        {
            if (normalizedQuery.Contains(phrase, StringComparison.Ordinal))
            {
                score += phrase.Contains(' ', StringComparison.Ordinal) ? 40 : 18;
            }
        }

        var matchedTokens = feature.MatchTokens.Count(queryTokens.Contains);
        score += matchedTokens * 10;

        if (matchedTokens >= 2)
        {
            score += 15;
        }

        if (looksLikeFeatureQuery && matchedTokens > 0)
        {
            score += 10;
        }

        return score;
    }

    private static int ScoreFeature(
        FeatureDefinition feature,
        string normalizedQuery,
        bool looksLikeFeatureQuery)
    {
        var queryTokens = Tokenize(normalizedQuery);
        return ScoreFeature(feature, normalizedQuery, queryTokens, looksLikeFeatureQuery);
    }

    private static int CountTopicHits(
        FeatureDefinition feature,
        string normalizedQuery,
        IReadOnlySet<string> queryTokens)
    {
        var phraseHits = feature.MatchPhrases.Count(phrase =>
            normalizedQuery.Contains(phrase, StringComparison.Ordinal));

        var tokenHits = feature.MatchTokens.Count(queryTokens.Contains);
        return phraseHits + tokenHits;
    }

    private static SiteFeatureMatch ToMatch(FeatureDefinition feature)
    {
        return new SiteFeatureMatch(
            feature.Id,
            feature.Title,
            feature.Status,
            feature.Summary,
            feature.Highlights,
            feature.Links);
    }

    private static string NormalizeForMatching(string value)
    {
        var cleaned = NonAlphaNumericRegex().Replace(value.ToLowerInvariant(), " ");
        return CollapseWhitespaceRegex().Replace(cleaned, " ").Trim();
    }

    private static HashSet<string> Tokenize(string normalizedValue)
    {
        return new HashSet<string>(
            normalizedValue
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            StringComparer.Ordinal);
    }

    [GeneratedRegex("[^a-z0-9]+", RegexOptions.Compiled)]
    private static partial Regex NonAlphaNumericRegex();

    [GeneratedRegex(@"\s+", RegexOptions.Compiled)]
    private static partial Regex CollapseWhitespaceRegex();

    private sealed record FeatureDefinition(
        string Id,
        int Order,
        string Title,
        string Status,
        string Summary,
        IReadOnlyList<string> Highlights,
        IReadOnlyList<SiteFeatureLink> Links,
        IReadOnlyList<string> MatchPhrases,
        IReadOnlyList<string> MatchTokens);

    private sealed record RankedFeature(FeatureDefinition Feature, int Score);
}
