# Docker Hub Image Publishing — Design

## Goal

Extend `.github/workflows/ci.yml` so that, after CI passes, Docker images for the workspace's apps are built and pushed to Docker Hub under the `buidangkhoa05` namespace. This builds on the existing CI workflow (frontend-ci / backend-ci / ci-success) added earlier; this spec covers only the new publishing behavior.

## Triggers & job gating

- `on.push` gains `tags: ['v*']` alongside the existing `branches: [main]`. Pushing a tag like `v1.2.3` now also triggers the workflow, in addition to pushes to `main` and PRs into `main`.
- `frontend-ci`, `backend-ci`, and `ci-success` each get `if: github.ref_type != 'tag'`. They exist to lint/test/build against an affected diff, which isn't meaningful for a release-tag push (the tagged commit was already validated when it landed on `main`). This condition is safe for `pull_request` events too, since `github.ref_type` is empty (not `'tag'`) there.
- New `docker-publish` job: `needs: [ci-success]`, with:
  ```
  if: |
    always() && (
      github.ref_type == 'tag' ||
      (github.ref == 'refs/heads/main' && needs.ci-success.result == 'success')
    )
  ```
  `always()` is required so this job still runs when `ci-success` was itself skipped (the tag-push case) — without it, GitHub Actions would propagate the skip.

## `docker-publish` job: matrix of 11 services

A **static** matrix (not dynamically generated — see Alternatives Considered) listing every app, since each needs different Dockerfile build args:

| matrix key | nx project | Dockerfile | build-args | Docker Hub repo |
|---|---|---|---|---|
| `api-gateway` | `Ikho.ApiGateway` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-api-gateway/Ikho.ApiGateway.csproj`, `ASSEMBLY_NAME=Ikho.ApiGateway` | `buidangkhoa05/ikho-api-gateway` |
| `ui` | `ikho-ui` | `apps/ikho-ui/Dockerfile` | (none) | `buidangkhoa05/ikho-ui` |
| `warehouse-billing` | `Ikho.Warehouse.Billing` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-billing/Ikho.Warehouse.Billing.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Billing` | `buidangkhoa05/ikho-warehouse-billing` |
| `warehouse-catalog` | `Ikho.Warehouse.Catalog` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-catalog/Ikho.Warehouse.Catalog.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Catalog` | `buidangkhoa05/ikho-warehouse-catalog` |
| `warehouse-inbound` | `Ikho.Warehouse.Inbound` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-inbound/Ikho.Warehouse.Inbound.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Inbound` | `buidangkhoa05/ikho-warehouse-inbound` |
| `warehouse-inventory` | `Ikho.Warehouse.Inventory` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-inventory/Ikho.Warehouse.Inventory.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Inventory` | `buidangkhoa05/ikho-warehouse-inventory` |
| `warehouse-organization` | `Ikho.Warehouse.Organization` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-organization/Ikho.Warehouse.Organization.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Organization` | `buidangkhoa05/ikho-warehouse-organization` |
| `warehouse-outbound` | `Ikho.Warehouse.Outbound` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-outbound/Ikho.Warehouse.Outbound.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Outbound` | `buidangkhoa05/ikho-warehouse-outbound` |
| `warehouse-partner` | `Ikho.Warehouse.Partner` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-partner/Ikho.Warehouse.Partner.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Partner` | `buidangkhoa05/ikho-warehouse-partner` |
| `warehouse-reporting` | `Ikho.Warehouse.Reporting` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-reporting/Ikho.Warehouse.Reporting.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Reporting` | `buidangkhoa05/ikho-warehouse-reporting` |
| `warehouse-returns` | `Ikho.Warehouse.Returns` | `docker/dotnet.Dockerfile` | `PROJECT_PATH=apps/ikho-warehouse-returns/Ikho.Warehouse.Returns.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Returns` | `buidangkhoa05/ikho-warehouse-returns` |

`strategy.fail-fast: false` — one service's build/push failure doesn't cancel the others.

This is a separate, standalone matrix rather than reusing each app's existing `docker-build` Nx target: those targets are hardcoded to build a local `ikho/<name>:local` tag for `docker-compose.yml` and don't push, so they aren't reusable for multi-tag registry publishing without changing their purpose. Build context is `source/` (matching `docker/dotnet.Dockerfile`'s existing local-build convention).

## Affected-check per matrix entry (main-branch pushes only)

Each matrix job:
1. Checks out (`fetch-depth: 0`), runs `nrwl/nx-set-shas@v4`, sets up pnpm/Node (needed to invoke the `nx` CLI, same as `backend-ci`).
2. If `github.ref_type == 'branch'` (a `main` push): runs `pnpm exec nx show projects --affected --json` and checks whether the matrix entry's nx project name is present. If not present, the job stops here — no Docker build/push for that service on this run.
3. If `github.ref_type == 'tag'`: skips the affected check — always proceeds to build and push, so a version tag always produces a consistent, complete 11-image snapshot regardless of what changed since the last tag.

## Tagging & authentication

- `docker/login-action@v3` with `username: buidangkhoa05` (hardcoded, not sensitive) and `password: ${{ secrets.DOCKERHUB_TOKEN }}`.
- `docker/setup-buildx-action@v3` + `docker/build-push-action@v6`, `context: source`, `push: true`.
- **Main-branch push:** tags `latest` and a short sha, computed via a shell step: `echo "sha_short=$(git rev-parse --short=7 HEAD)" >> "$GITHUB_OUTPUT"`.
- **Version-tag push** (e.g. `refs/tags/v1.2.3`): tags the image `1.2.3` — the leading `v` stripped from `github.ref_name` via `${{ github.ref_name }}` with a shell substitution (`${GITHUB_REF_NAME#v}`). Does **not** also tag `latest` — a release doesn't silently override what `main` currently publishes.

## Manual prerequisite (outside this change)

Before `docker-publish` can succeed, a Docker Hub access token must be created and added as the GitHub repository secret `DOCKERHUB_TOKEN` on `buidangkhoa05/iKho` (`Settings → Secrets and variables → Actions`). This requires the account owner's Docker Hub credentials and GitHub repo-admin access — neither available to this workflow's implementer. Until the secret exists, `docker-publish` will fail at the login step; this is expected and does not block landing the workflow changes themselves (only actual publishing).

## Alternatives considered

- **Dynamic matrix** (a prior job computes the affected project list and generates the matrix via `fromJson`): more efficient (skips spinning up a runner for unaffected services entirely) but adds a two-job indirection and JSON-plumbing complexity. Rejected for now per YAGNI — the static-matrix-with-per-job-skip approach is simpler to read and debug, at the cost of ~11 short-lived "skip" runner allocations per main push instead of zero.
- **Always publish all 11 images on every main push:** simpler, but means constant redundant pushes to Docker Hub for services that didn't change. Rejected in favor of affected-only publishing on `main`, with tag pushes as the explicit "build everything" path.
- **Tagging a release also updates `latest`:** rejected — would make `latest` ambiguous between "latest main build" and "latest release," and could regress `latest` to an older commit if a release tag is cut from a past state.

## Out of scope

- Multi-architecture image builds (linux/amd64 only, matching current local Dockerfiles)
- Image vulnerability scanning
- Deployment / pulling these images anywhere (this spec only covers publishing)
- Creating the `DOCKERHUB_TOKEN` secret itself (manual prerequisite, see above)
