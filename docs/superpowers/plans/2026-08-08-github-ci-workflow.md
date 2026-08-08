# GitHub Actions CI Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `.github/workflows/ci.yml`, a monorepo-aware GitHub Actions CI workflow that lints/tests/builds affected Angular projects and builds affected .NET projects on every PR into `main` and every push to `main`.

**Architecture:** A single workflow file with three jobs: `frontend-ci` (Node/pnpm toolchain, runs `nx affected -t lint test build`), `backend-ci` (Node/pnpm + .NET SDK toolchain, runs `nx affected -t build`), and `ci-success` (a lightweight gate job that depends on both, for branch-protection required-check simplicity). All three run against the affected range computed by `nrwl/nx-set-shas`.

**Tech Stack:** GitHub Actions, Nx 23 (`nx affected`), pnpm, Node 22, .NET 10 SDK.

## Global Constraints

- File location: `.github/workflows/ci.yml` (exact path, per spec)
- Triggers: `pull_request` targeting `main`, and `push` to `main` — no other branches/events
- Concurrency: group `ci-${{ github.workflow }}-${{ github.ref }}`, `cancel-in-progress: true`
- Every job checks out with `fetch-depth: 0`, then runs `nrwl/nx-set-shas@v4` to compute `NX_BASE`/`NX_HEAD` — no Nx Cloud account/token
- pnpm is set up via `pnpm/action-setup@v4`; Node via `actions/setup-node@v4` with `node-version: 22` and `cache: pnpm` (`cache-dependency-path: source/pnpm-lock.yaml`)
- All `pnpm`/`nx` commands run with working directory `source` (via job-level `defaults.run.working-directory: source`)
- `.NET` SDK via `actions/setup-dotnet@v4`, `dotnet-version: '10.0.x'`
- Frontend job caches `source/.nx/cache`; backend job caches `~/.nuget/packages`
- Frontend job command: `pnpm exec nx affected -t lint test build --parallel=3`
- Backend job command: `pnpm exec nx affected -t build --parallel=3` (no `test` — no `.NET` test projects exist yet)
- `ci-success` job: `needs: [frontend-ci, backend-ci]`, `if: always()`, fails if either dependency did not succeed
- Out of scope: Docker build/push, deployment, Nx Cloud, `.NET` test execution, schema codegen verification

---

### Task 1: Workflow skeleton + `frontend-ci` job

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: workflow file with top-level `on`/`concurrency` keys, and a job named `frontend-ci` in `.github/workflows/ci.yml`. Task 2 and Task 3 append sibling jobs under the same `jobs:` map.

- [ ] **Step 1: Write the workflow file with triggers, concurrency, and the `frontend-ci` job**

Create `D:\Workspace\iKho\.github\workflows\ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  frontend-ci:
    name: Frontend (lint, test, build)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: source
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: nrwl/nx-set-shas@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: source/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile

      - uses: actions/cache@v4
        with:
          path: source/.nx/cache
          key: nx-frontend-${{ hashFiles('source/pnpm-lock.yaml') }}-${{ github.sha }}
          restore-keys: |
            nx-frontend-${{ hashFiles('source/pnpm-lock.yaml') }}-

      - run: pnpm exec nx affected -t lint test build --parallel=3
```

- [ ] **Step 2: Verify the YAML parses**

Run from the repo root (`D:\Workspace\iKho`):

```bash
cd source && node -e "
const yaml = require('./node_modules/.pnpm/js-yaml@4.3.0/node_modules/js-yaml');
const fs = require('fs');
const doc = yaml.load(fs.readFileSync('../.github/workflows/ci.yml', 'utf8'));
if (!doc.on.pull_request || !doc.on.push) throw new Error('missing triggers');
if (!doc.jobs['frontend-ci']) throw new Error('missing frontend-ci job');
console.log('YAML OK, jobs:', Object.keys(doc.jobs));
"
```

Expected: prints `YAML OK, jobs: [ 'frontend-ci' ]` with no error.

- [ ] **Step 3: Smoke-test the exact frontend command locally**

This proves the target names (`lint`, `test`, `build`) and project selection actually work, using the same `nx affected` invocation the workflow will run, against the full repo history as the base (so every project is considered affected — the same situation the very first run of this workflow will face):

```bash
cd "D:/Workspace/iKho/source" && pnpm exec nx affected -t lint test build --parallel=3 --base=$(git rev-list --max-parents=0 HEAD) --head=HEAD
```

Expected: Nx runs `lint`, `test`, and `build` for `ikho-ui` and `ikho-shared-ui` (and any other affected JS project) and exits 0. If `ikho-ui`'s production build is slow, that's expected — let it finish; a non-zero exit means a real problem to fix before proceeding (do not skip forward).

- [ ] **Step 4: Commit**

```bash
cd "D:/Workspace/iKho" && git add .github/workflows/ci.yml && git commit -m "$(cat <<'EOF'
ci: Add frontend CI job for Nx-affected lint/test/build

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `backend-ci` job

**Files:**
- Modify: `.github/workflows/ci.yml` (append a sibling job under `jobs:`)

**Interfaces:**
- Consumes: the `jobs:` map produced in Task 1 (appends `backend-ci` as a sibling of `frontend-ci`)
- Produces: a job named `backend-ci` in `.github/workflows/ci.yml`. Task 3's `ci-success` job depends on both `frontend-ci` and `backend-ci` by these exact names.

- [ ] **Step 1: Append the `backend-ci` job**

Edit `D:\Workspace\iKho\.github\workflows\ci.yml`: insert a new job immediately after the `frontend-ci` job's last step (`pnpm exec nx affected -t lint test build --parallel=3`), keeping it nested under the same `jobs:` key:

```yaml
      - run: pnpm exec nx affected -t lint test build --parallel=3

  backend-ci:
    name: Backend (.NET build)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: source
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: nrwl/nx-set-shas@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: source/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile

      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - uses: actions/cache@v4
        with:
          path: ~/.nuget/packages
          key: nuget-${{ hashFiles('source/**/*.csproj') }}
          restore-keys: |
            nuget-

      - run: pnpm exec nx affected -t build --parallel=3
```

(The first line above is the existing last line of `frontend-ci` — use it as the anchor for the edit; everything from `  backend-ci:` onward is new.)

- [ ] **Step 2: Verify the YAML parses and both jobs are present**

```bash
cd "D:/Workspace/iKho/source" && node -e "
const yaml = require('./node_modules/.pnpm/js-yaml@4.3.0/node_modules/js-yaml');
const fs = require('fs');
const doc = yaml.load(fs.readFileSync('../.github/workflows/ci.yml', 'utf8'));
const jobs = Object.keys(doc.jobs);
if (!jobs.includes('frontend-ci') || !jobs.includes('backend-ci')) throw new Error('missing job: ' + jobs);
console.log('YAML OK, jobs:', jobs);
"
```

Expected: prints `YAML OK, jobs: [ 'frontend-ci', 'backend-ci' ]`.

- [ ] **Step 3: Smoke-test the exact backend command locally**

```bash
cd "D:/Workspace/iKho/source" && pnpm exec nx affected -t build --parallel=3 --base=$(git rev-list --max-parents=0 HEAD) --head=HEAD
```

Expected: Nx runs the `build` target for every affected `.NET` project (`Ikho.ApiGateway`, `Ikho.Warehouse.*`, `Ikho.SharedLibrary`, `IkhoSchemaManagement`) via `dotnet build` and exits 0. A non-zero exit means a real build problem — fix it before proceeding.

- [ ] **Step 4: Commit**

```bash
cd "D:/Workspace/iKho" && git add .github/workflows/ci.yml && git commit -m "$(cat <<'EOF'
ci: Add backend CI job for Nx-affected .NET build

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `ci-success` gate job

**Files:**
- Modify: `.github/workflows/ci.yml` (append a sibling job under `jobs:`)

**Interfaces:**
- Consumes: job names `frontend-ci` and `backend-ci` from Tasks 1–2 (referenced via `needs` and `needs.<job>.result`)
- Produces: a job named `ci-success` — this is the job name to configure as the required status check in GitHub branch protection.

- [ ] **Step 1: Append the `ci-success` job**

Edit `D:\Workspace\iKho\.github\workflows\ci.yml`: insert a new job immediately after the `backend-ci` job's last step (`pnpm exec nx affected -t build --parallel=3`):

```yaml
      - run: pnpm exec nx affected -t build --parallel=3

  ci-success:
    name: CI success
    runs-on: ubuntu-latest
    needs: [frontend-ci, backend-ci]
    if: always()
    steps:
      - name: Check job results
        run: |
          if [ "${{ needs.frontend-ci.result }}" != "success" ] || [ "${{ needs.backend-ci.result }}" != "success" ]; then
            echo "One or more CI jobs failed."
            exit 1
          fi
```

(The first line above is the existing last line of `backend-ci` — use it as the anchor; everything from `  ci-success:` onward is new.)

- [ ] **Step 2: Verify the YAML parses and all three jobs are present with correct `needs`**

```bash
cd "D:/Workspace/iKho/source" && node -e "
const yaml = require('./node_modules/.pnpm/js-yaml@4.3.0/node_modules/js-yaml');
const fs = require('fs');
const doc = yaml.load(fs.readFileSync('../.github/workflows/ci.yml', 'utf8'));
const jobs = Object.keys(doc.jobs);
if (jobs.join(',') !== 'frontend-ci,backend-ci,ci-success') throw new Error('unexpected jobs: ' + jobs);
const needs = doc.jobs['ci-success'].needs;
if (needs.join(',') !== 'frontend-ci,backend-ci') throw new Error('unexpected needs: ' + needs);
console.log('YAML OK, jobs:', jobs, 'ci-success needs:', needs);
"
```

Expected: prints `YAML OK, jobs: [ 'frontend-ci', 'backend-ci', 'ci-success' ] ci-success needs: [ 'frontend-ci', 'backend-ci' ]`.

- [ ] **Step 3: Commit**

```bash
cd "D:/Workspace/iKho" && git add .github/workflows/ci.yml && git commit -m "$(cat <<'EOF'
ci: Add ci-success gate job for branch protection

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: End-to-end verification on GitHub Actions

**Files:** none (verification only)

**Interfaces:** none — this task confirms the workflow built in Tasks 1–3 actually runs correctly on GitHub's runners, which local smoke tests can't fully prove (real `ubuntu-latest` environment, real `nx-set-shas` PR-base detection, real branch-protection integration).

This task pushes a branch and opens a PR against `origin` (`https://github.com/buidangkhoa05/iKho`). **Confirm with the user before pushing** — this is a repo-visible action on a real remote.

- [ ] **Step 1: Push the current branch and open a PR**

```bash
cd "D:/Workspace/iKho" && git push -u origin HEAD
```

Then open a PR from this branch into `main` (via `gh pr create` if the GitHub CLI is available and authenticated, otherwise via the GitHub web UI — report the compare URL to the user: `https://github.com/buidangkhoa05/iKho/compare/main...<branch-name>`).

- [ ] **Step 2: Watch the workflow run and confirm all three jobs pass**

Open the PR's "Checks" tab (or `gh pr checks <PR#> --watch` if `gh` is available). Confirm:
- `frontend-ci` completes successfully
- `backend-ci` completes successfully
- `ci-success` completes successfully

If any job fails, read its log, fix the workflow file, commit, push, and re-check — do not mark this task done until all three are green on an actual GitHub Actions run.

- [ ] **Step 3: Report back to the user**

Summarize the PR URL and the run result. Ask the user whether to merge the PR now, leave it open for their own review, or (optionally, if they want it enforced immediately) configure `ci-success` as a required status check in branch protection settings — do not enable branch protection unilaterally.
