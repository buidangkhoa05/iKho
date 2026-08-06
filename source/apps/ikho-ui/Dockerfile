# syntax=docker/dockerfile:1
#
# Angular 19 SSR (Express) build for ikho-ui. This is an Nx workspace app, so
# the build context must be the `source/` directory (sibling pnpm-workspace.yaml,
# nx.json, and libs/ikho-shared-ui which ikho-ui path-aliases straight to source):
#
#   docker build -f apps/ikho-ui/Dockerfile -t ikho/ui:local .
#
# docker-compose.yml drives this; see the ikho-ui `docker-build` Nx target for
# the equivalent standalone command.

FROM node:22-slim AS deps
WORKDIR /workspace
# nx.json explicitly registers @nx/dotnet, which shells out to `dotnet` to
# analyze every .csproj in the workspace while computing the Nx project graph -
# even for an ikho-ui-only build. Borrow the CLI from the SDK image rather than
# a separate install step (already pulled for the .NET service images).
COPY --from=mcr.microsoft.com/dotnet/sdk:10.0 /usr/share/dotnet /usr/share/dotnet
ENV PATH="/usr/share/dotnet:${PATH}" \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /workspace
COPY . .
RUN pnpm nx build ikho-ui --configuration=production

FROM node:22-slim AS prod-deps
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-slim AS final
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY --from=prod-deps --chown=node:node /workspace/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/dist/apps/ikho-ui/. ./
EXPOSE 4000
USER node
ENTRYPOINT ["node", "server/server.mjs"]
