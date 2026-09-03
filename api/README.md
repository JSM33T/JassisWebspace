# JassSpace API

The JassSpace API is the .NET backend for Jass Space. It serves public content, authentication, profiles, comments, likes, media, email workflows, and admin tooling.

## Runtime

| Area | Details |
| --- | --- |
| Framework | .NET 10 / ASP.NET Core |
| SDK | `10.0.101` from `global.json` |
| Database | PostgreSQL through Entity Framework Core |
| Cache | Redis through `IDistributedCache` and `RedisCacheService` |
| Jobs | Hangfire with PostgreSQL storage |
| Auth | JWT bearer tokens, refresh tokens, Google OAuth, GitHub OAuth |
| Logging | Serilog with compact JSON console output |
| Tests | xUnit |

## Solution Layout

```text
api/
|-- JassSpace.sln
|-- global.json
|-- JassSpace.Api/          # ASP.NET Core app, controllers, middleware, jobs, startup config
|-- JassSpace.Contracts/    # Request/response DTOs and service/repository interfaces
|-- JassSpace.Data/         # EF Core DbContext, migrations, design-time factory
|-- JassSpace.Entities/     # Database/domain entities
|-- JassSpace.Infra/        # Email, Redis, blob storage, image processing, token helpers
|-- JassSpace.Repositories/ # Repository implementations
|-- JassSpace.Services/     # Business logic and external integrations
`-- JassSpace.Tests/        # Unit and service tests
```

## Startup Flow

`JassSpace.Api/Program.cs` wires the application in this order:

1. Configure Serilog.
2. Register controllers and OpenAPI in development.
3. Register EF Core using PostgreSQL and the `JassSpace.Data` migrations assembly.
4. Register JWT authentication and authorization.
5. Register CORS for trusted frontend origins.
6. Register Redis, rate limiting, Hangfire, repositories, services, jobs, and external clients.
7. Apply forwarded headers, correlation IDs, request logging, CORS, HTTPS redirection outside development, auth, and the Hangfire dashboard.
8. Optionally apply EF Core migrations on startup.
9. Validate PostgreSQL and Redis connectivity before serving requests.

Startup fails deliberately if required database or Redis configuration is missing or unreachable.

## Main API Areas

### Public And Account Routes

| Route Prefix | Purpose |
| --- | --- |
| `/` and `/health` | Root and health responses |
| `/auth` | Login, register, refresh, logout, email verification, password reset, OAuth |
| `/profile` | Authenticated profile, password, sessions, public profile lookup |
| `/user` | Public user details |
| `/account/email-preferences` | Email preference and unsubscribe flows |
| `/contact` | Contact form and Turnstile site-key lookup |
| `/search` | Site search |

### Content Routes

| Route Prefix | Purpose |
| --- | --- |
| `/blog` | Public blog listing, details, categories, and authenticated creation |
| `/gallery` | Public albums and images |
| `/music` | Public tracks and play-link flow |
| `/comments` | Content comments |
| `/likes` | Content likes and counts |
| `/views` | Anonymous content view tracking |
| `/seo` | SEO metadata for blog, gallery, and music pages |
| `/ui-properties` | Public and admin-controlled UI properties |
| `/media` | Media uploads, profile media, cached media, thumbnails |
| `/bootleg` | Protected bootleg upload/admin flows and signed public streaming |

### Admin Routes

Admin routes are protected by role-based authorization.

| Route Prefix | Roles | Purpose |
| --- | --- | --- |
| `/admin/dashboard` | `admin`, `mod` | Dashboard stats |
| `/admin/content` | `admin`, `mod` | Content listing and lookup |
| `/admin/blog` | `admin`, `mod` where required | Blog and category management |
| `/admin/gallery` | `admin` | Gallery albums, images, audit, cache invalidation |
| `/admin/music` | `admin`, `mod` | Music tracks, covers, audio |
| `/admin/email` | `admin` | Email templates, tests, broadcasts |
| `/admin/users` | `admin` | User management |
| `/admin/contact` | `admin` | Contact message management |

## Configuration

The API reads configuration from `appsettings.json`, environment-specific appsettings files, user secrets in development, and environment variables.

Important settings:

| Setting | Purpose |
| --- | --- |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `ConnectionStrings__Redis` | Redis connection string |
| `JWT__SecretKey` | JWT signing key, 32+ characters recommended |
| `JWT__Issuer` | JWT issuer |
| `JWT__Audience` | JWT audience |
| `JWT__ExpiryMinutes` | Access token lifetime |
| `JWT__RefreshTokenExpiryDays` | Refresh token lifetime |
| `OAuth__Google__*` | Google OAuth client settings |
| `OAuth__GitHub__*` | GitHub OAuth client settings |
| `Email__Smtp__*` | SMTP delivery settings |
| `Redis__InstanceName` | Redis key prefix |
| `Hangfire__*` | Hangfire schema, queue, dashboard, and basic auth |
| `AzureBlobStorage__*` | Media storage and cache settings |
| `BootlegStreaming__*` | Signed streaming token settings |
| `OpenRouter__*` | AI/chat integration settings |
| `Turnstile__*` | Cloudflare Turnstile verification settings |
| `Serilog__*` | Logging sinks, levels, and enrichers |

Use the repository root `.env.example` as the main source for environment variable names.

## Local Development

Run commands from the `api` folder unless shown otherwise.

```powershell
dotnet restore JassSpace.sln
dotnet run --project JassSpace.Api
```

For Docker Compose from the repository root:

```powershell
docker compose up -d --build dotnet
```

The Compose stack exposes the API on host port `5001`.

## Database Migrations

The EF Core design-time factory reads configuration from `JassSpace.Api/appsettings*.json` and environment variables. For local migration work, set one of:

- `ConnectionStrings__DefaultConnection`
- `JASSSPACE_DESIGNTIME_CONNECTION`

Add a migration:

```powershell
dotnet ef migrations add "Migration Name" --project JassSpace.Data --startup-project JassSpace.Api
```

Apply migrations:

```powershell
dotnet ef database update --project JassSpace.Data --startup-project JassSpace.Api
```

Docker startup migrations are controlled by `ApplyMigrationsOnStartup`.

- Local/base Compose default: `false`
- Production override default: `true`

## Validation

Restore dependencies:

```powershell
dotnet restore JassSpace.sln
```

Build:

```powershell
dotnet build JassSpace.sln --configuration Release
```

Run all tests:

```powershell
dotnet test JassSpace.sln --configuration Release
```

## OpenAPI

OpenAPI is registered with `AddOpenApi()` and mapped only in development:

```text
/openapi/v1.json
```

## Hangfire

Hangfire uses PostgreSQL storage and runs with the default queue plus the configured email queue.

Default dashboard path:

```text
/hangfire
```

Dashboard access is protected by basic auth from:

- `Hangfire__DashboardAuth__Username`
- `Hangfire__DashboardAuth__Password`

The API also registers a recurring unverified-account cleanup job:

```text
account-cleanup-daily-7am
```

## CORS

The API allows trusted frontend origins:

- `jassi.me`
- subdomains of `jassi.me`
- `localhost`
- `127.0.0.1`
- Azure Dev Tunnel hosts ending in `.devtunnels.ms`

Credentials are allowed so authenticated frontend calls can send cookies or authorization headers.

## Rate Limiting

Rate limiting is configured under `RateLimiting`.

Current named policies include:

- `auth-login`
- `auth-register`
- `auth-verification-resend`
- `auth-forgot-password`
- `profile-avatar-update`
- `content-view`

Rate limit headers are applied through the shared controller helpers.

## Logging And Diagnostics

The API uses:

- Serilog request logging.
- `CorrelationIdMiddleware`.
- Structured request completion enrichment.
- Startup dependency checks for PostgreSQL and Redis.

When debugging production behavior, check both container logs and the application logs configured through Serilog.

## Deployment Notes

The API is deployed by `.github/workflows/deploy-dotnet.yml` when `main` receives changes under:

- `api/**`
- `docker-compose*.yml`
- `.github/workflows/deploy-dotnet.yml`

The workflow:

1. Restores, builds, and tests the API solution.
2. Connects to the production host over SSH.
3. Acquires the shared remote `.deploy.lock`.
4. Resets the server checkout to `origin/main`.
5. Rebuilds and starts the `dotnet` Compose service with `--wait`.
6. Shows recent service logs.

The dotnet and Next.js deploy workflows share the `jassspace-production-deploy` concurrency group so production deploys run serially.

## Development Standards

- Keep business logic in `JassSpace.Services` and contracts in `JassSpace.Contracts`.
- Keep controller actions thin and use shared response helpers from `BaseApiController`.
- Prefer typed request and response DTOs over anonymous response shapes.
- Add or update tests when changing service behavior, controller contracts, auth, rate limits, migrations, or external integrations.
- Do not commit real secrets, local appsettings overrides, logs, or generated build output.
