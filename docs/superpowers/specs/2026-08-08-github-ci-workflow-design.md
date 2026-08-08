# GitHub Actions CI Workflow — Design

## Goal

Add a GitHub Actions workflow that validates every change to the iKho monorepo: lint, test, and build the Angular/Node projects, and build the .NET projects. The workflow must respect the monorepo — only affected projects run, and each toolchain (Node vs .NET) is set up and checked independently.

This is CI validation only. No Docker image publishing, no deployment. Those are explicitly out of scope and can be layered on as a separate workflow later.

## Triggers

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Runs on every PR targeting `main` and on every push to `main` (e.g. after a merge). A new push to the same ref cancels the previous in-progress run for that ref.

## Determining the affected range

Every job starts with:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: nrwl/nx-set-shas@v4
```

- `fetch-depth: 0` pulls full git history, which `nx affected` needs to diff against a base commit.
- `nrwl/nx-set-shas@v4` sets `NX_BASE`/`NX_HEAD` env vars correctly for both event types: PR base commit for `pull_request`, and last-successful-main-commit for `push`. No Nx Cloud account is required — this action works standalone against the git history in the runner.

No Nx Cloud / remote caching is configured. Caching is handled per-job via `actions/cache` (see below).

## Job: `frontend-ci`

Covers Angular projects (`ikho-ui`, `ikho-shared-ui`).

```yaml
frontend-ci:
  runs-on: ubuntu-latest
  steps:
    - checkout + nx-set-shas (as above)
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm
        cache-dependency-path: source/pnpm-lock.yaml
    - run: pnpm install --frozen-lockfile
      working-directory: source
    - uses: actions/cache@v4
      with:
        path: source/.nx/cache
        key: nx-frontend-${{ hashFiles('source/pnpm-lock.yaml') }}-${{ github.sha }}
        restore-keys: nx-frontend-${{ hashFiles('source/pnpm-lock.yaml') }}-
    - run: pnpm exec nx affected -t lint test build --parallel=3
      working-directory: source
```

If no JS/Angular project is affected by a change, `nx affected` no-ops cleanly.

## Job: `backend-ci`

Covers .NET projects (`ikho-api-gateway`, `ikho-warehouse-*`, `ikho-shared-library`, `ikho-schema-management`). Runs in parallel with `frontend-ci`.

```yaml
backend-ci:
  runs-on: ubuntu-latest
  steps:
    - checkout + nx-set-shas (as above)
    - uses: pnpm/action-setup@v4        # nx itself is a Node CLI, needed even for .NET targets
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm
        cache-dependency-path: source/pnpm-lock.yaml
    - run: pnpm install --frozen-lockfile
      working-directory: source
    - uses: actions/setup-dotnet@v4
      with:
        dotnet-version: '10.0.x'
    - uses: actions/cache@v4
      with:
        path: ~/.nuget/packages
        key: nuget-${{ hashFiles('source/**/*.csproj') }}
        restore-keys: nuget-
    - run: pnpm exec nx affected -t build --parallel=3
      working-directory: source
```

No `test` target is run for .NET: there are no `*.Tests` projects in the repo today, so there's nothing to wire up. Nx infers a `test` target automatically for any .NET test project once one exists (via the `@nx/dotnet` plugin) — at that point, add `test` to this job's `nx affected -t build test` call. No other workflow change is needed when that day comes.

## Job: `ci-success` (required-check gate)

```yaml
ci-success:
  runs-on: ubuntu-latest
  needs: [frontend-ci, backend-ci]
  if: always()
  steps:
    - run: |
        if [ "${{ needs.frontend-ci.result }}" != "success" ] || [ "${{ needs.backend-ci.result }}" != "success" ]; then
          echo "One or more CI jobs failed."
          exit 1
        fi
```

This is the single job name to configure as a required status check in branch protection. As more jobs are added to this workflow in the future, add them to `needs` here rather than updating branch protection settings directly.

## Out of scope (explicitly deferred)

- Docker image build/push
- Deployment / CD
- Nx Cloud remote caching or distributed task execution
- `.NET` test execution (no test projects exist yet)
- Schema codegen verification (`nx run-many -t generate`) — generated contracts are checked into git; regenerating them is a manual/local step, not a CI gate

## File location

`.github/workflows/ci.yml`
