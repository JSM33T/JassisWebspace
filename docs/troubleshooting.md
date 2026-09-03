# Troubleshooting

Start with the smallest useful signal: service status, recent logs, then the configuration that connects the affected service. Do not paste `.env` contents, JWT keys, connection strings, or tokens into issues or chat messages.

## Quick Checks

From the repository root:

```powershell
docker compose ps
docker compose logs dotnet --since=10m
docker compose logs nextjs --since=10m
```

For local development, the normal host ports are:

| Service | Port |
| --- | --- |
| Next.js UI | `3001` |
| ASP.NET Core API | `5001` |
| PostgreSQL | `5433` |
| Redis | `6379` |
| Azurite Blob service | `10000` |

## API Does Not Start

The API deliberately checks PostgreSQL and Redis before serving requests. A missing or unreachable dependency prevents startup.

1. Inspect the API logs for the first connection error.
2. Confirm `postgres` and `redis` are running with `docker compose ps`.
3. Verify the API uses Docker hostnames `postgres` and `redis` inside the Compose network, not `localhost`.
4. Confirm `ConnectionStrings__DefaultConnection` and `ConnectionStrings__Redis` are set for the active environment.
5. Restart only the API after correcting configuration:

```powershell
docker compose up -d --build dotnet
```

For a local non-Docker API run, use the correct local PostgreSQL port (`5433` with the Compose override), not the database container port (`5432`).

## UI Cannot Reach The API

Check the URL from the caller's perspective:

| Caller | Expected URL |
| --- | --- |
| Browser on local machine | `http://localhost:5001` |
| Next.js container server-side request | `http://dotnet:8080` |

`NEXT_PUBLIC_API_URL` is embedded in the browser build. Change it before rebuilding the UI, then run:

```powershell
docker compose up -d --build nextjs
```

Do not use `localhost` for an API call made from inside the Next.js container; there it refers to the Next.js container itself.

## Database Migration Problems

Set either `ConnectionStrings__DefaultConnection` or `JASSSPACE_DESIGNTIME_CONNECTION` before running EF Core tooling. From `api/`:

```powershell
dotnet ef database update --project JassSpace.Data --startup-project JassSpace.Api
```

For a failed production startup migration, inspect the API logs and the database connection first. Do not repeatedly recreate production containers until the migration error is understood. Local/base Compose defaults `ApplyMigrationsOnStartup` to `false`; the production override defaults it to `true`.

## Build Or Test Failures

For the API:

```powershell
dotnet restore JassSpace.sln
dotnet build JassSpace.sln --configuration Release
dotnet test JassSpace.sln --configuration Release
```

For the UI:

```powershell
npm ci
npm run lint
npm run build
```

Run commands from `api/` or `ui/` as appropriate. Use `npm ci` rather than `npm install` when validating the committed lockfile. The API SDK is pinned by `api/global.json`.

## Stale Content

There are two common cache layers:

| Symptom | Check |
| --- | --- |
| Home content, gallery, blog, or music appears old | Review the relevant `*_REVALIDATE_SECONDS` setting and rebuild/redeploy the UI when changing build-time public values. |
| Media image looks old | Check the configured media cache directory and the current media provider before removing cached files. |

Avoid deleting `.data/` as a cache reset. It holds local PostgreSQL, Redis, Azurite,
and logs. Media cache data is stored separately in the `dotnet-media-cache` Docker
volume; remove only the narrowly identified cache after stopping the service that
uses it.

## Media Upload Or Image Problems

1. Confirm the chosen storage provider is configured: Azure Blob Storage or Cloudinary.
2. For local Compose, verify the `azurite` container is healthy and the media cache volume is writable.
3. Check `docker compose logs dotnet --since=10m` while reproducing the upload.
4. In local UI development, `UNOPTIMIZED_IMAGES=true` disables the Next.js image optimizer and can help isolate optimizer-related behavior.

## Authentication, OAuth, Or Email Failures

| Area | Check |
| --- | --- |
| JWT login or refresh | `JWT__SecretKey`, issuer, audience, and token-expiry settings |
| Google or GitHub login | Client ID, client secret, and redirect URI match the provider registration exactly |
| Email delivery | SMTP host, port, TLS setting, account, password, and sender address |
| Hangfire dashboard | Dashboard username/password and PostgreSQL availability |

Provider redirect URI mismatches are usually configuration problems, not frontend routing bugs. Compare the active environment URL exactly, including scheme, port, and callback path.

## Production Deployment Fails

1. Open the matching GitHub Actions workflow run.
2. Identify whether failure occurred during validation, SSH setup, lock acquisition, Compose health wait, or service logs.
3. Confirm `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, and `REMOTE_DIR` are configured as GitHub production secrets.
4. On the server, inspect the affected service:

```powershell
docker compose -p jassspace ps
docker compose -p jassspace logs dotnet --since=5m
docker compose -p jassspace logs nextjs --since=5m
```

The remote deployment checkout is reset to `origin/main` by design. Do not fix production by editing source files directly on the server; create a corrective commit and deploy it through the normal workflow.

For the deployment sequence, see [Deployment Guide](deployment.md). For all configuration keys, see [Environment Configuration](environment.md).
