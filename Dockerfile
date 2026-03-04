# ── Stage 1: Build Angular ──────────────────────────────────────────────────
FROM node:20-alpine AS ng-build
WORKDIR /ng
COPY client/package.json client/package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY client/ .
RUN npx ng build --configuration production

# ── Stage 2: Build .NET ─────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-build
WORKDIR /src
COPY server/UnionRulesApi/ .
RUN dotnet publish -c Release -o /publish

# ── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim

# Install nginx and supervisord
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx supervisor \
 && rm -rf /var/lib/apt/lists/*

# Angular static files
COPY --from=ng-build /ng/dist/client/browser /var/www/html

# .NET published output
COPY --from=dotnet-build /publish /app

# nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/app.conf

# Cloud Run listens on 8080 by default
EXPOSE 8080

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]
