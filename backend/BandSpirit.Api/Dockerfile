# ==============================================================================
# BANDspirit API — Multi-Stage Dockerfile (.NET 8)
# ==============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Projektdatei zuerst kopieren und restaurieren (Layer-Caching).
COPY *.csproj ./
RUN dotnet restore

# Restlichen Quellcode kopieren und veröffentlichen.
COPY . .
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# ── Stage 2: Runtime ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# curl für Health-Checks installieren.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root-Benutzer (uid 1001) anlegen.
RUN adduser --system --uid 1001 --group aspnet

COPY --from=build /app/publish .

# Log-Verzeichnis mit passenden Rechten.
RUN mkdir -p /app/logs && chown -R aspnet:aspnet /app

USER aspnet

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Docker
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "BandSpirit.Api.dll"]
