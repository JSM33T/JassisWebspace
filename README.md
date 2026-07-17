# Jass Space

Jass Space is a personal web platform made of a Next.js frontend and a .NET API backend. It powers public content pages, gallery and music browsing, blog content, user accounts, admin tools, contact flows, comments, likes, search, email workflows, and a GitHub-backed development wall.

## At A Glance

| Area | Details |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | .NET 10, ASP.NET Core, Entity Framework Core |
| Database | PostgreSQL |
| Cache | Redis |
| Background jobs | Hangfire |
| Auth | JWT, refresh tokens, Google OAuth, GitHub OAuth |
| Deployment | Docker Compose and GitHub Actions |
| Main local ports | UI `3001`, API `5001` |

## Repository Layout

```text
.
|-- api/                       # .NET solution, API, services, data, tests
|   |-- JassSpace.Api/          # ASP.NET Core entrypoint and controllers
|   |-- JassSpace.Contracts/    # Request/response DTOs and interfaces
|   |-- JassSpace.Data/         # DbContext and EF Core migrations
|   |-- JassSpace.Entities/     # Domain entities
|   |-- JassSpace.Infra/        # Email, cache, storage, and infrastructure services
|   |-- JassSpace.Repositories/ # Data access layer
|   |-- JassSpace.Services/     # Business logic
|   `-- JassSpace.Tests/        # xUnit tests
|-- ui/                         # Next.js application
|   |-- app/                    # App Router pages and routes
|   |-- components/             # Shared UI components
|   |-- lib/                    # API clients, helpers, cache utilities
|   `-- public/                 # Static assets
|-- .github/workflows/          # Deployment and maintenance workflows
|-- docker-compose.yml          # Base Compose stack
|-- docker-compose.prod.yml     # Production Compose overrides
`-- .env.example                # Environment variable template
```

## Main Features

- Public portfolio-style pages for services, projects, blog, gallery, music, uses, and contact.
- Authenticated account area with profile, security, preferences, and OAuth support.
- Admin dashboard for content, blog, gallery, music, email, users, settings, and development management.
- Blog and gallery content backed by the API, with search and pagination patterns in the UI.
- Comments, likes, public user profiles, and anonymous content view tracking.
- GitHub-backed development wall for suggestions, issues, releases, notes, and public progress tracking.
- Email templates, SMTP delivery, contact handling, and background jobs.
- Dockerized API and UI services with production-oriented resource limits.

## Prerequisites

- Node.js 20 or newer.
- npm.
- .NET SDK `10.0.101` or a compatible latest feature roll-forward version.
- Docker and Docker Compose for containerized runs.
- PostgreSQL and Redis for local non-container development.

The .NET SDK version is controlled by [api/global.json](api/global.json).

## Environment Setup

Copy the example environment file and fill in local values:

```powershell
Copy-Item .env.example .env
```

Important groups in `.env.example`:

- `ConnectionStrings__DefaultConnection` for PostgreSQL.
- `ConnectionStrings__Redis` for Redis.
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, and `NEXT_PUBLIC_SITE_URL` for the frontend.
- `JWT__*` for authentication tokens.
- `OAuth__Google__*` and `OAuth__GitHub__*` for OAuth login.
- `GitHub__Owner`, `GitHub__Repository`, and optional `GitHub__Token` for the development wall.
- `Email__Smtp__*` for email delivery.
- `Hangfire__DashboardAuth__*` for the Hangfire dashboard.

Do not commit real `.env` files. The root `.gitignore` already ignores `.env`.

## Local Development

### Run The API

```powershell
cd api
dotnet restore JassSpace.sln
dotnet run --project JassSpace.Api
```

The API is exposed by Docker Compose on port `5001`. Direct `dotnet run` settings depend on the API launch profile and local configuration.

### Run The UI

```powershell
cd ui
npm install
npm run dev
```

The Next.js dev server runs on:

```text
http://localhost:3001
```

### Run With Docker Compose

```powershell
docker compose up -d --build
```

The base Compose stack starts:

- `dotnet` on host port `5001`
- `nextjs` on host port `3001`

Production overrides can be applied with:

```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## Database Migrations

Run migration commands from the `api` folder.

### Add A Migration

```powershell
dotnet ef migrations add "Migration Name" --project JassSpace.Data --startup-project JassSpace.Api
```

### Update The Database

```powershell
dotnet ef database update --project JassSpace.Data --startup-project JassSpace.Api
```

### Docker Compose Startup Migrations

When the API starts through Docker Compose, pending EF Core migrations can be applied automatically by `ApplyMigrationsOnStartup`.

- Base Compose default: `APPLY_MIGRATIONS=false`
- Production override default: `APPLY_MIGRATIONS=true`

## Validation

### Backend

```powershell
dotnet restore api/JassSpace.sln
dotnet build api/JassSpace.sln --configuration Release
dotnet test api/JassSpace.sln --configuration Release
```

### Frontend

```powershell
npm --prefix ui ci
npm --prefix ui run lint
npm --prefix ui run build
```

Use `npm.cmd --prefix ui ...` on Windows if PowerShell blocks the npm shim.

## Deployment

Deployment is handled through GitHub Actions and Docker Compose.

- `.github/workflows/deploy-dotnet.yml` validates, tests, and deploys the .NET service when API or Compose files change on `main`.
- `.github/workflows/deploy-nextjs.yml` validates, lints, builds, and deploys the Next.js service when UI or Compose files change on `main`.
- `.github/workflows/refresh-containers.yml` manually recreates containers on the production server.

The dotnet and Next.js deploy workflows share the same GitHub Actions concurrency group:

```text
jassspace-production-deploy
```

The remote deployment scripts also use a shared `.deploy.lock` file so production deployments run serially.

Required GitHub deployment secrets:

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `REMOTE_DIR`
- `SSH_PRIVATE_KEY`

## Branch Workflow

Recommended branch usage:

- `dev` is the integration branch for active work.
- `main` is the production branch.
- Merge `dev` into `main` when validated changes are ready for deployment.
- Push both branches when they are expected to stay in sync.

For feature work, prefer short-lived branches from `dev`, then merge back into `dev` before promoting to `main`.

## Useful Commands

```powershell
# Check current branch and local changes
git status --short --branch

# Build the API
dotnet build api/JassSpace.sln

# Run API tests
dotnet test api/JassSpace.sln

# Lint the UI
npm.cmd --prefix ui run lint

# Build the UI
npm.cmd --prefix ui run build

# Start both services with Docker Compose
docker compose up -d --build
```

## Notes

- Keep real secrets in local `.env` files or GitHub Actions secrets.
- Keep public-facing content truthful and safe to expose.
- Prefer shared UI components and shared service paths over page-local one-off logic.
- When changing deployment behavior, verify both the GitHub Actions workflow and the remote Docker Compose path.
