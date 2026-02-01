# See https://aka.ms/customizecontainer to learn how to customize your debug container
# and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# ------------------------------------------------------------
# Base runtime image
# ------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/runtime:10.0 AS base

# Install required native dependency for PostgreSQL (Npgsql)
USER root
RUN apt-get update && apt-get install -y \
    libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

# Switch back to non-root user
USER $APP_UID
WORKDIR /app

# ------------------------------------------------------------
# Build stage
# ------------------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["JassSpace.Worker/JassSpace.Worker.csproj", "JassSpace.Worker/"]
RUN dotnet restore "./JassSpace.Worker/JassSpace.Worker.csproj"

COPY . .
WORKDIR "/src/JassSpace.Worker"
RUN dotnet build "./JassSpace.Worker.csproj" -c $BUILD_CONFIGURATION -o /app/build

# ------------------------------------------------------------
# Publish stage
# ------------------------------------------------------------
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./JassSpace.Worker.csproj" \
    -c $BUILD_CONFIGURATION \
    -o /app/publish \
    /p:UseAppHost=false

# ------------------------------------------------------------
# Final runtime image
# ------------------------------------------------------------
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "JassSpace.Worker.dll"]
