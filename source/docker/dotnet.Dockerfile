# syntax=docker/dockerfile:1
#
# Generic multi-stage Dockerfile shared by every .NET app/lib in this workspace
# (api-gateway, shared-library, and all warehouse-* services). Project references
# span apps/ and libs/, so the build context must be the `source/` directory and
# the two build args below select which project actually gets published:
#
#   docker build -f docker/dotnet.Dockerfile \
#     --build-arg PROJECT_PATH=apps/ikho-warehouse-organization/Ikho.WarehouseOrganization.csproj \
#     --build-arg ASSEMBLY_NAME=Ikho.WarehouseOrganization \
#     -t ikho/warehouse-organization:local .
#
# docker-compose.yml drives this for every service; see the per-project
# `docker-build` Nx target for the equivalent standalone command.

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG PROJECT_PATH
ARG ASSEMBLY_NAME
WORKDIR /src

COPY . .
RUN dotnet restore "${PROJECT_PATH}"
RUN dotnet publish "${PROJECT_PATH}" -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
ARG ASSEMBLY_NAME
ENV ASSEMBLY_NAME=${ASSEMBLY_NAME} \
    ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
WORKDIR /app
EXPOSE 8080

# curl backs the compose-level healthcheck on services that map /health/live
# (every warehouse-* service via Ikho.SharedLibrary's ServiceDefaults).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["/bin/sh", "-c", "exec dotnet \"$ASSEMBLY_NAME.dll\""]
