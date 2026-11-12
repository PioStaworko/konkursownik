# syntax=docker/dockerfile:1

# 1) Frontend -> wwwroot (vite outDir is ../backend/Konkursownik.Api/wwwroot)
FROM node:22 AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2) Backend publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json Directory.Build.props Konkursownik.sln ./
COPY backend/Konkursownik.Api/Konkursownik.Api.csproj backend/Konkursownik.Api/
COPY backend/Konkursownik.Tests/Konkursownik.Tests.csproj backend/Konkursownik.Tests/
RUN dotnet restore backend/Konkursownik.Api/Konkursownik.Api.csproj
COPY backend/ backend/
COPY --from=frontend /src/backend/Konkursownik.Api/wwwroot backend/Konkursownik.Api/wwwroot
RUN dotnet publish backend/Konkursownik.Api/Konkursownik.Api.csproj -c Release -o /app --no-restore

# 3) Runtime (Debian-based image: ships tzdata + ICU; do not enable invariant globalization)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app ./
USER root
RUN mkdir -p /data/photos /data/keys && chown -R $APP_UID:$APP_UID /data
USER $APP_UID
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Konkursownik.Api.dll"]
