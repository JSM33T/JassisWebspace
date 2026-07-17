# Environment Configuration

Copy `.env.example` to `.env` for local Docker development and replace each placeholder with an appropriate value. `.env` is ignored by Git and must never be committed. Production configuration is supplied on the deployment host through its environment file and GitHub deployment secrets.

ASP.NET Core environment variables use double underscores for nested configuration. For example, `JWT__SecretKey` maps to `JWT:SecretKey` in `appsettings.json`.

## Baseline Configuration

These settings are needed for a full local or production runtime.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ConnectionStrings__DefaultConnection` | Yes | PostgreSQL connection used by the API |
| `ConnectionStrings__Redis` | Yes | Redis connection used for caching and shared rate-limiting state |
| `NEXT_PUBLIC_API_URL` | Yes | Public API URL baked into the Next.js browser build |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL for the frontend application |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical site URL used by frontend features |
| `Frontend__BaseUrl` | Yes | Frontend URL used by API-generated links and redirects |
| `JWT__SecretKey` | Yes | Secret used to sign JWTs; use a unique value of at least 32 characters |
| `JWT__Issuer` | Yes | JWT issuer identifier |
| `JWT__Audience` | Yes | JWT audience identifier |
| `JWT__ExpiryMinutes` | Yes | Access-token lifetime in minutes |
| `JWT__RefreshTokenExpiryDays` | Yes | Refresh-token lifetime in days |

`API_URL` is a server-only Next.js value. Docker Compose sets it to `http://dotnet:8080`, which lets the Next.js container call the API through the internal Docker network. It should not be exposed with a `NEXT_PUBLIC_` prefix.

## Docker And Deployment

| Variable | Required | Purpose |
| --- | --- | --- |
| `COMPOSE_FILE` | Production | Selects the production Compose override: `docker-compose.yml:docker-compose.prod.yml` |
| `DEPLOY_PATH` | Production | Absolute deployment directory used by production volume mounts |
| `APPLY_MIGRATIONS` | Recommended | Controls whether the API applies EF Core migrations at startup |
| `JASSSPACE_DESIGNTIME_CONNECTION` | EF tooling | Optional connection string used by design-time migration commands |
| `DB_CONNECTION` | Production setup | Production PostgreSQL connection when the Compose override maps it into API configuration |
| `REDIS_CONNECTION` | Production setup | Production Redis connection when the Compose override maps it into API configuration |
| `Serilog__WriteTo__1__Args__path` | Optional | Path for Serilog file output when that sink is enabled |

Keep `APPLY_MIGRATIONS` deliberate in production. The production Compose override defaults it to `true`; use a controlled migration process before turning it off or changing the default.

## Frontend Caching And Images

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOME_CONTENT_REVALIDATE_SECONDS` | Optional | Cache duration for home-page content feeds |
| `HOME_GALLERIES_REVALIDATE_SECONDS` | Optional | Cache duration for gallery data on the home page |
| `HOME_BLOGS_REVALIDATE_SECONDS` | Optional | Cache duration for blog data on the home page |
| `MUSIC_TRACKS_REVALIDATE_SECONDS` | Optional | Cache duration for music-track data |
| `UNOPTIMIZED_IMAGES` | Local development | Set to `true` to disable Next.js image optimization |

The `NEXT_PUBLIC_*` variables are visible to browser code after build time. Never put a secret, token, database address, or private internal hostname in one of them.

## OAuth And GitHub

| Variable | Required | Purpose |
| --- | --- | --- |
| `OAuth__Google__ClientId` | When Google login is enabled | Google OAuth client identifier |
| `OAuth__Google__ClientSecret` | When Google login is enabled | Google OAuth client secret |
| `OAuth__Google__RedirectUri` | When Google login is enabled | Registered Google callback URL |
| `OAuth__GitHub__ClientId` | When GitHub login is enabled | GitHub OAuth client identifier |
| `OAuth__GitHub__ClientSecret` | When GitHub login is enabled | GitHub OAuth client secret |
| `OAuth__GitHub__RedirectUri` | When GitHub login is enabled | Registered GitHub callback URL |
| `GitHub__Owner` | Development wall | GitHub organization or user that owns the backing repository |
| `GitHub__Repository` | Development wall | Repository used for development-wall issues and releases |
| `GitHub__Token` | Issue promotion | Server-only token used to create or manage GitHub issues |
| `GitHub__CacheMinutes` | Optional | Minutes to cache GitHub read models |

The GitHub development wall can read public data without a token, but promoting a suggestion to an issue requires `GitHub__Token`. Grant the token the least privilege needed for the configured repository.

## Email, Jobs, And Streaming

| Variable | Required | Purpose |
| --- | --- | --- |
| `Email__Smtp__Host` | Email features | SMTP server host |
| `Email__Smtp__Port` | Email features | SMTP server port |
| `Email__Smtp__EnableSsl` | Email features | Enables SMTP TLS/SSL |
| `Email__Smtp__Username` | Email features | SMTP account name |
| `Email__Smtp__Password` | Email features | SMTP account password or app password |
| `Email__Smtp__FromEmail` | Email features | Sender email address |
| `Email__Smtp__FromName` | Email features | Sender display name |
| `Email__Smtp__Timeout` | Optional | SMTP operation timeout in milliseconds |
| `Hangfire__DashboardAuth__Username` | Production | Username for the Hangfire dashboard |
| `Hangfire__DashboardAuth__Password` | Production | Password for the Hangfire dashboard |
| `BootlegStreaming__SigningKey` | Bootleg streaming | Secret used to sign streaming access tokens |
| `BootlegStreaming__TokenTtlMinutes` | Optional | Streaming-token lifetime in minutes |

## Media, Security, And External Integrations

Only configure these sections when their feature is enabled or selected by the deployed environment.

| Variable | Feature | Purpose |
| --- | --- | --- |
| `Cloudinary__CloudName` | Cloudinary | Cloudinary cloud name |
| `Cloudinary__ApiKey` | Cloudinary | Cloudinary API key |
| `Cloudinary__ApiSecret` | Cloudinary | Cloudinary API secret |
| `Cloudinary__Folder` | Cloudinary | Base media folder |
| `Cloudinary__CacheDirectory` | Cloudinary | Local media-cache directory |
| `AzureBlobStorage__ConnectionString` | Azure Blob Storage | Storage account connection string |
| `AzureBlobStorage__ContainerName` | Azure Blob Storage | Blob container name |
| `AzureBlobStorage__CacheDirectory` | Azure Blob Storage | Local media-cache directory |
| `AzureBlobStorage__UseLocalCache` | Azure Blob Storage | Enables local cache reads/writes |
| `IpGeolocation__Enabled` | IP geolocation | Turns geolocation lookup on or off |
| `IpGeolocation__BaseUrl` | IP geolocation | Provider base URL |
| `IpGeolocation__CacheDuration` | IP geolocation | Cached lookup duration |
| `IpGeolocation__DefaultAccuracyMeters` | IP geolocation | Fallback location accuracy |
| `IpGeolocation__SkipPrivateRanges` | IP geolocation | Avoids lookup for private network ranges |
| `IpGeolocation__ApiKey` | IP geolocation | Provider API key, when required |
| `OpenRouter__BaseUrl` | OpenRouter | API base URL |
| `OpenRouter__ApiKey` | OpenRouter | API key |
| `OpenRouter__Model` | OpenRouter | Model identifier |
| `OpenRouter__SiteUrl` | OpenRouter | Site URL sent with provider requests |
| `OpenRouter__SiteName` | OpenRouter | Site name sent with provider requests |
| `OpenRouter__SystemPrompt` | OpenRouter | Server-side system prompt |
| `OpenRouter__Temperature` | OpenRouter | Model sampling temperature |
| `Turnstile__Enabled` | Cloudflare Turnstile | Enables challenge verification |
| `Turnstile__SiteKey` | Cloudflare Turnstile | Browser-visible Turnstile site key |
| `Turnstile__SecretKey` | Cloudflare Turnstile | Server-side verification secret |
| `Turnstile__VerifyUrl` | Cloudflare Turnstile | Turnstile verification endpoint |
| `Payments__Razorpay__KeyId` | Razorpay | Razorpay key identifier |
| `Payments__Razorpay__KeySecret` | Razorpay | Razorpay key secret |
| `Payments__Razorpay__BaseUrl` | Razorpay | Razorpay API base URL |

## Security Rules

1. Treat connection strings, signing keys, passwords, private API keys, and OAuth client secrets as secrets.
2. Use distinct secrets and service accounts for local, staging, and production environments.
3. Rotate a value immediately if it is committed, exposed in logs, or shared outside its intended system.
4. Keep `.env` local and configure production values only on the server or in the GitHub secret store.
5. Use `.env.example` as the source of variable names and safe placeholder examples, not as an operational secret file.

For deployment-specific secret names and workflow behavior, see [Deployment Guide](deployment.md). For the runtime relationships between the UI, API, and infrastructure, see [Architecture](architecture.md).
