# Jass Space

## Migrations

### Add Migrations

```powershell
dotnet ef migrations add "Initial Rebase" --project JassSpace.Data --startup-project JassSpace.Api
```

### Update Database

```powershell
dotnet ef database update --project JassSpace.Data --startup-project JassSpace.Api
```

### Docker Compose Startup Migrations

When the API is started through `docker-compose.yml`, pending EF Core migrations are applied automatically on server startup because `ApplyMigrationsOnStartup=true` is set for the `dotnet` service.
