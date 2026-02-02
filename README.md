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