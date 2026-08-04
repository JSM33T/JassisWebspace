# syntax=docker/dockerfile:1.6

# Make SDK version available to any FROM below
ARG DOTNET_SDK_VERSION=10.0.101   # set once; or 10.0.101 if you keep global.json pinned

# Base runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
ARG APP_UID=64198
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    libkrb5-3 \
    libgssapi-krb5-2 \
    libvips42 \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/logs/dotnet /app/cache \
    && chown -R ${APP_UID}:${APP_UID} /app/logs /app/cache
USER ${APP_UID}

# Build
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_SDK_VERSION} AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy global.json first so the resolver picks the right SDK (and cache works)
COPY api/global.json ./

# Restore
COPY api/JassSpace.Api/JassSpace.Api.csproj api/JassSpace.Api/
COPY api/JassSpace.Tests/JassSpace.Tests.csproj api/JassSpace.Tests/
COPY api/JassSpace.Contracts/JassSpace.Contracts.csproj api/JassSpace.Contracts/
COPY api/JassSpace.Data/JassSpace.Data.csproj api/JassSpace.Data/
COPY api/JassSpace.Entities/JassSpace.Entities.csproj api/JassSpace.Entities/
COPY api/JassSpace.Infra/JassSpace.Infra.csproj api/JassSpace.Infra/
COPY api/JassSpace.Repositories/JassSpace.Repositories.csproj api/JassSpace.Repositories/
COPY api/JassSpace.Services/JassSpace.Services.csproj api/JassSpace.Services/
RUN dotnet restore api/JassSpace.Api/JassSpace.Api.csproj
RUN dotnet restore api/JassSpace.Tests/JassSpace.Tests.csproj

# Copy the rest and build
COPY . .
WORKDIR /src/api/JassSpace.Api
RUN dotnet build JassSpace.Api.csproj -c $BUILD_CONFIGURATION -o /app/build

# Publish
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
WORKDIR /src/api/JassSpace.Api
RUN dotnet publish JassSpace.Api.csproj -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Test runner
FROM build AS test
ARG BUILD_CONFIGURATION=Release
WORKDIR /src/api
ENTRYPOINT ["dotnet", "test", "JassSpace.Tests/JassSpace.Tests.csproj", "-c", "Release", "--no-restore", "--logger", "console;verbosity=normal"]

# Final
FROM base AS final
ARG APP_UID=64198
USER root
RUN mkdir -p /app/logs/dotnet && chown -R ${APP_UID}:${APP_UID} /app/logs
USER ${APP_UID}

WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "JassSpace.Api.dll"]
