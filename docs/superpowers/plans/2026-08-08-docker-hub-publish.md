# Docker Hub Image Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `.github/workflows/ci.yml` with a `docker-publish` job that builds and pushes Docker images for the workspace's 11 apps to Docker Hub (`buidangkhoa05/ikho-*`) — affected-only on pushes to `main`, all 11 on version-tag pushes.

**Architecture:** Add `tags: ['v*']` to the workflow's push trigger. Gate the existing `frontend-ci`/`backend-ci`/`ci-success` jobs to skip on tag pushes (`github.ref_type != 'tag'`). Add a new `docker-publish` job with a static 11-entry matrix; each matrix job checks (via `nx show projects --affected`) whether its service changed on a `main` push, always builds on a tag push, then logs in to Docker Hub and pushes via `docker/build-push-action`.

**Tech Stack:** GitHub Actions, `docker/login-action@v3`, `docker/setup-buildx-action@v3`, `docker/build-push-action@v6`, Nx (`nx show projects --affected`).

## Global Constraints

- File: `.github/workflows/ci.yml` (already exists — modify it, don't recreate)
- `on.push` gains `tags: ['v*']` alongside the existing `branches: [main]`
- `frontend-ci`, `backend-ci`, `ci-success` each get `if: github.ref_type != 'tag'` (append to `ci-success`'s existing `if: always()` as `if: always() && github.ref_type != 'tag'`)
- New job `docker-publish`: `needs: [ci-success]`, `if: always() && (github.ref_type == 'tag' || (github.ref == 'refs/heads/main' && needs.ci-success.result == 'success'))`
- Static matrix of exactly these 11 entries (key / nx_project / dockerfile / build_args / repo):
  1. `api-gateway` / `Ikho.ApiGateway` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-api-gateway/Ikho.ApiGateway.csproj`, `ASSEMBLY_NAME=Ikho.ApiGateway` / `buidangkhoa05/ikho-api-gateway`
  2. `ui` / `ikho-ui` / `apps/ikho-ui/Dockerfile` / (none) / `buidangkhoa05/ikho-ui`
  3. `warehouse-billing` / `Ikho.Warehouse.Billing` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-billing/Ikho.Warehouse.Billing.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Billing` / `buidangkhoa05/ikho-warehouse-billing`
  4. `warehouse-catalog` / `Ikho.Warehouse.Catalog` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-catalog/Ikho.Warehouse.Catalog.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Catalog` / `buidangkhoa05/ikho-warehouse-catalog`
  5. `warehouse-inbound` / `Ikho.Warehouse.Inbound` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-inbound/Ikho.Warehouse.Inbound.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Inbound` / `buidangkhoa05/ikho-warehouse-inbound`
  6. `warehouse-inventory` / `Ikho.Warehouse.Inventory` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-inventory/Ikho.Warehouse.Inventory.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Inventory` / `buidangkhoa05/ikho-warehouse-inventory`
  7. `warehouse-organization` / `Ikho.Warehouse.Organization` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-organization/Ikho.Warehouse.Organization.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Organization` / `buidangkhoa05/ikho-warehouse-organization`
  8. `warehouse-outbound` / `Ikho.Warehouse.Outbound` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-outbound/Ikho.Warehouse.Outbound.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Outbound` / `buidangkhoa05/ikho-warehouse-outbound`
  9. `warehouse-partner` / `Ikho.Warehouse.Partner` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-partner/Ikho.Warehouse.Partner.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Partner` / `buidangkhoa05/ikho-warehouse-partner`
  10. `warehouse-reporting` / `Ikho.Warehouse.Reporting` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-reporting/Ikho.Warehouse.Reporting.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Reporting` / `buidangkhoa05/ikho-warehouse-reporting`
  11. `warehouse-returns` / `Ikho.Warehouse.Returns` / `docker/dotnet.Dockerfile` / `PROJECT_PATH=apps/ikho-warehouse-returns/Ikho.Warehouse.Returns.csproj`, `ASSEMBLY_NAME=Ikho.Warehouse.Returns` / `buidangkhoa05/ikho-warehouse-returns`
- `strategy.fail-fast: false` on the matrix
- Build context: `source` (repo-root-relative); Dockerfile path: `source/${{ matrix.dockerfile }}`
- Main-branch push tags: `latest` + short sha (`git rev-parse --short=7 HEAD`)
- Version-tag push tags: `${GITHUB_REF_NAME#v}` only (no `latest`)
- Auth: `docker/login-action@v3` with `username: buidangkhoa05` (hardcoded) and `password: ${{ secrets.DOCKERHUB_TOKEN }}` (repository secret — user-managed prerequisite, not created by this plan)
- Out of scope: multi-arch builds, vulnerability scanning, deployment, creating the `DOCKERHUB_TOKEN` secret

---

### Task 1: Trigger + job-gating changes

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `on.push.tags: ['v*']`; `if: github.ref_type != 'tag'` on `frontend-ci` and `backend-ci`; `if: always() && github.ref_type != 'tag'` on `ci-success`. Task 2's `docker-publish` job depends on `ci-success`'s name and result being available exactly as today.

- [ ] **Step 1: Add the tag trigger**

Edit `.github/workflows/ci.yml`, change:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

to:

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
    tags: ['v*']
```

- [ ] **Step 2: Gate `frontend-ci` to skip on tag pushes**

Change:

```yaml
  frontend-ci:
    name: Frontend (lint, test, build)
    runs-on: ubuntu-latest
```

to:

```yaml
  frontend-ci:
    name: Frontend (lint, test, build)
    runs-on: ubuntu-latest
    if: github.ref_type != 'tag'
```

- [ ] **Step 3: Gate `backend-ci` to skip on tag pushes**

Change:

```yaml
  backend-ci:
    name: Backend (.NET build)
    runs-on: ubuntu-latest
```

to:

```yaml
  backend-ci:
    name: Backend (.NET build)
    runs-on: ubuntu-latest
    if: github.ref_type != 'tag'
```

- [ ] **Step 4: Gate `ci-success` to skip on tag pushes**

Change:

```yaml
  ci-success:
    name: CI success
    runs-on: ubuntu-latest
    needs: [frontend-ci, backend-ci]
    if: always()
```

to:

```yaml
  ci-success:
    name: CI success
    runs-on: ubuntu-latest
    needs: [frontend-ci, backend-ci]
    if: always() && github.ref_type != 'tag'
```

- [ ] **Step 5: Verify the YAML parses and the new fields are present**

```bash
cd "D:/Workspace/iKho/source" && node -e "
const yaml = require('./node_modules/.pnpm/js-yaml@4.3.0/node_modules/js-yaml');
const fs = require('fs');
const doc = yaml.load(fs.readFileSync('../.github/workflows/ci.yml', 'utf8'));
if (doc.on.push.tags.join(',') !== 'v*') throw new Error('missing push.tags');
if (doc.jobs['frontend-ci'].if !== \"github.ref_type != 'tag'\") throw new Error('frontend-ci if wrong: ' + doc.jobs['frontend-ci'].if);
if (doc.jobs['backend-ci'].if !== \"github.ref_type != 'tag'\") throw new Error('backend-ci if wrong: ' + doc.jobs['backend-ci'].if);
if (doc.jobs['ci-success'].if !== \"always() && github.ref_type != 'tag'\") throw new Error('ci-success if wrong: ' + doc.jobs['ci-success'].if);
console.log('YAML OK');
"
```

Expected: prints `YAML OK`.

- [ ] **Step 6: Commit**

```bash
cd "D:/Workspace/iKho" && git add .github/workflows/ci.yml && git commit -m "$(cat <<'EOF'
ci: Gate CI jobs to skip on tag pushes, add tag trigger

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `docker-publish` job — matrix + affected check

**Files:**
- Modify: `.github/workflows/ci.yml` (append a new job)

**Interfaces:**
- Consumes: `ci-success` job name/result from Task 1
- Produces: job `docker-publish` with matrix variables `matrix.key`, `matrix.nx_project`, `matrix.dockerfile`, `matrix.build_args`, `matrix.repo`, and step output `steps.affected.outputs.should_publish` (`'true'`/`'false'`) — Task 3 gates its steps on this output.

- [ ] **Step 1: Append the `docker-publish` job (matrix + affected check only, no Docker steps yet)**

Add at the end of `.github/workflows/ci.yml`, after the `ci-success` job's `Check job results` step:

```yaml

  docker-publish:
    name: Publish ${{ matrix.key }} image
    needs: [ci-success]
    if: |
      always() && (
        github.ref_type == 'tag' ||
        (github.ref == 'refs/heads/main' && needs.ci-success.result == 'success')
      )
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        include:
          - key: api-gateway
            nx_project: Ikho.ApiGateway
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-api-gateway/Ikho.ApiGateway.csproj
              ASSEMBLY_NAME=Ikho.ApiGateway
            repo: buidangkhoa05/ikho-api-gateway
          - key: ui
            nx_project: ikho-ui
            dockerfile: apps/ikho-ui/Dockerfile
            build_args: ""
            repo: buidangkhoa05/ikho-ui
          - key: warehouse-billing
            nx_project: Ikho.Warehouse.Billing
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-billing/Ikho.Warehouse.Billing.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Billing
            repo: buidangkhoa05/ikho-warehouse-billing
          - key: warehouse-catalog
            nx_project: Ikho.Warehouse.Catalog
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-catalog/Ikho.Warehouse.Catalog.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Catalog
            repo: buidangkhoa05/ikho-warehouse-catalog
          - key: warehouse-inbound
            nx_project: Ikho.Warehouse.Inbound
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-inbound/Ikho.Warehouse.Inbound.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Inbound
            repo: buidangkhoa05/ikho-warehouse-inbound
          - key: warehouse-inventory
            nx_project: Ikho.Warehouse.Inventory
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-inventory/Ikho.Warehouse.Inventory.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Inventory
            repo: buidangkhoa05/ikho-warehouse-inventory
          - key: warehouse-organization
            nx_project: Ikho.Warehouse.Organization
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-organization/Ikho.Warehouse.Organization.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Organization
            repo: buidangkhoa05/ikho-warehouse-organization
          - key: warehouse-outbound
            nx_project: Ikho.Warehouse.Outbound
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-outbound/Ikho.Warehouse.Outbound.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Outbound
            repo: buidangkhoa05/ikho-warehouse-outbound
          - key: warehouse-partner
            nx_project: Ikho.Warehouse.Partner
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-partner/Ikho.Warehouse.Partner.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Partner
            repo: buidangkhoa05/ikho-warehouse-partner
          - key: warehouse-reporting
            nx_project: Ikho.Warehouse.Reporting
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-reporting/Ikho.Warehouse.Reporting.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Reporting
            repo: buidangkhoa05/ikho-warehouse-reporting
          - key: warehouse-returns
            nx_project: Ikho.Warehouse.Returns
            dockerfile: docker/dotnet.Dockerfile
            build_args: |
              PROJECT_PATH=apps/ikho-warehouse-returns/Ikho.Warehouse.Returns.csproj
              ASSEMBLY_NAME=Ikho.Warehouse.Returns
            repo: buidangkhoa05/ikho-warehouse-returns
    defaults:
      run:
        working-directory: source
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: nrwl/nx-set-shas@v4
        if: github.ref_type == 'branch'

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: source/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile

      - name: Check whether this service is affected
        id: affected
        run: |
          if [ "${{ github.ref_type }}" = "tag" ]; then
            echo "should_publish=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          AFFECTED=$(pnpm exec nx show projects --affected --json)
          if echo "$AFFECTED" | node -e "
            let d='';process.stdin.on('data',c=>d+=c);
            process.stdin.on('end',()=>{
              const list = JSON.parse(d);
              process.exit(list.includes('${{ matrix.nx_project }}') ? 0 : 1);
            });
          "; then
            echo "should_publish=true" >> "$GITHUB_OUTPUT"
          else
            echo "should_publish=false" >> "$GITHUB_OUTPUT"
          fi
```

- [ ] **Step 2: Verify the YAML parses and the matrix has all 11 entries**

```bash
cd "D:/Workspace/iKho/source" && node -e "
const yaml = require('./node_modules/.pnpm/js-yaml@4.3.0/node_modules/js-yaml');
const fs = require('fs');
const doc = yaml.load(fs.readFileSync('../.github/workflows/ci.yml', 'utf8'));
const job = doc.jobs['docker-publish'];
if (!job) throw new Error('missing docker-publish job');
const entries = job.strategy.matrix.include;
if (entries.length !== 11) throw new Error('expected 11 matrix entries, got ' + entries.length);
const repos = entries.map(e => e.repo);
const expected = ['buidangkhoa05/ikho-api-gateway','buidangkhoa05/ikho-ui','buidangkhoa05/ikho-warehouse-billing','buidangkhoa05/ikho-warehouse-catalog','buidangkhoa05/ikho-warehouse-inbound','buidangkhoa05/ikho-warehouse-inventory','buidangkhoa05/ikho-warehouse-organization','buidangkhoa05/ikho-warehouse-outbound','buidangkhoa05/ikho-warehouse-partner','buidangkhoa05/ikho-warehouse-reporting','buidangkhoa05/ikho-warehouse-returns'];
for (const r of expected) if (!repos.includes(r)) throw new Error('missing repo: ' + r);
console.log('YAML OK, 11 matrix entries present');
"
```

Expected: prints `YAML OK, 11 matrix entries present`.

- [ ] **Step 3: Locally simulate the affected-check logic**

This proves the `nx show projects --affected --json` output shape and the Node membership check (the same logic used inside the workflow's `Check whether this service is affected` step) work as expected:

```bash
cd "D:/Workspace/iKho/source" && NX_BASE=$(git rev-list --max-parents=0 HEAD) NX_HEAD=HEAD pnpm exec nx show projects --affected --json > "$TEMP/affected.json" && cat "$TEMP/affected.json" && AFFECTED_FILE="$TEMP/affected.json" node -e "
const fs = require('fs');
const list = JSON.parse(fs.readFileSync(process.env.AFFECTED_FILE, 'utf8'));
if (!Array.isArray(list)) throw new Error('expected an array, got: ' + JSON.stringify(list));
console.log('Parsed OK, ' + list.length + ' affected projects:', list);
console.log('Ikho.ApiGateway affected?', list.includes('Ikho.ApiGateway'));
"
```

Expected: prints a JSON array of project names (using the root commit as base, everything should be affected — same as the earlier `ci.yml` smoke tests), then `Parsed OK, ...` with `Ikho.ApiGateway affected? true`.

- [ ] **Step 4: Commit**

```bash
cd "D:/Workspace/iKho" && git add .github/workflows/ci.yml && git commit -m "$(cat <<'EOF'
ci: Add docker-publish job matrix with affected-check

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `docker-publish` — tag computation + login/build/push

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `steps.affected.outputs.should_publish` from Task 2; `matrix.dockerfile`, `matrix.build_args`, `matrix.repo` from Task 2's matrix
- Produces: `steps.tags.outputs.tags` (comma-separated `repo:tag` list) used by the final `docker/build-push-action@v6` step

- [ ] **Step 1: Append the tag-computation and Docker steps**

Edit `.github/workflows/ci.yml`: insert these steps immediately after the `Check whether this service is affected` step (the last step in the `docker-publish` job from Task 2):

```yaml
      - name: Compute image tags
        if: steps.affected.outputs.should_publish == 'true'
        id: tags
        run: |
          if [ "${{ github.ref_type }}" = "tag" ]; then
            VERSION="${GITHUB_REF_NAME#v}"
            echo "tags=${{ matrix.repo }}:$VERSION" >> "$GITHUB_OUTPUT"
          else
            SHA_SHORT=$(git rev-parse --short=7 HEAD)
            echo "tags=${{ matrix.repo }}:latest,${{ matrix.repo }}:$SHA_SHORT" >> "$GITHUB_OUTPUT"
          fi

      - uses: docker/login-action@v3
        if: steps.affected.outputs.should_publish == 'true'
        with:
          username: buidangkhoa05
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - uses: docker/setup-buildx-action@v3
        if: steps.affected.outputs.should_publish == 'true'

      - uses: docker/build-push-action@v6
        if: steps.affected.outputs.should_publish == 'true'
        with:
          context: source
          file: source/${{ matrix.dockerfile }}
          build-args: ${{ matrix.build_args }}
          push: true
          tags: ${{ steps.tags.outputs.tags }}
```

- [ ] **Step 2: Verify the YAML parses and the job has all expected steps**

```bash
cd "D:/Workspace/iKho/source" && node -e "
const yaml = require('./node_modules/.pnpm/js-yaml@4.3.0/node_modules/js-yaml');
const fs = require('fs');
const doc = yaml.load(fs.readFileSync('../.github/workflows/ci.yml', 'utf8'));
const steps = doc.jobs['docker-publish'].steps;
const uses = steps.filter(s => s.uses).map(s => s.uses.split('@')[0]);
for (const expected of ['docker/login-action', 'docker/setup-buildx-action', 'docker/build-push-action']) {
  if (!uses.includes(expected)) throw new Error('missing step: ' + expected);
}
const buildPush = steps.find(s => s.uses && s.uses.startsWith('docker/build-push-action'));
if (buildPush.with.tags !== '\${{ steps.tags.outputs.tags }}') throw new Error('unexpected tags input: ' + buildPush.with.tags);
console.log('YAML OK, docker-publish has', steps.length, 'steps');
"
```

Expected: prints `YAML OK, docker-publish has 10 steps`.

- [ ] **Step 3: Commit**

```bash
cd "D:/Workspace/iKho" && git add .github/workflows/ci.yml && git commit -m "$(cat <<'EOF'
ci: Add tag computation and Docker Hub login/build/push to docker-publish

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Local Docker build smoke test (no push)

**Files:** none (verification only)

**Interfaces:** none — proves the exact `context`/`file`/`build-args` combination the workflow uses actually builds, for one `.NET` service and for `ikho-ui`, without needing Docker Hub credentials.

- [ ] **Step 1: Build the `.NET` warehouse-organization image locally, matching the workflow's exact args**

```bash
cd "D:/Workspace/iKho/source" && docker build -f docker/dotnet.Dockerfile \
  --build-arg PROJECT_PATH=apps/ikho-warehouse-organization/Ikho.Warehouse.Organization.csproj \
  --build-arg ASSEMBLY_NAME=Ikho.Warehouse.Organization \
  -t buidangkhoa05/ikho-warehouse-organization:smoke-test .
```

Expected: `docker build` exits 0, ending with `naming to docker.io/buidangkhoa05/ikho-warehouse-organization:smoke-test`.

- [ ] **Step 2: Build the `ikho-ui` image locally, matching the workflow's exact args**

```bash
cd "D:/Workspace/iKho/source" && docker build -f apps/ikho-ui/Dockerfile \
  -t buidangkhoa05/ikho-ui:smoke-test .
```

Expected: `docker build` exits 0, ending with `naming to docker.io/buidangkhoa05/ikho-ui:smoke-test`.

- [ ] **Step 3: Clean up the local smoke-test images**

```bash
docker rmi buidangkhoa05/ikho-warehouse-organization:smoke-test buidangkhoa05/ikho-ui:smoke-test
```

No commit — this task makes no source changes.

---

### Task 5: End-to-end verification on GitHub Actions

**Files:** none (verification only)

**Interfaces:** none — confirms the full workflow (trigger gating, matrix, affected-skip path, and the real Docker Hub login/build/push path) works on GitHub's actual runners against a real Docker Hub account.

**Prerequisite check:** Before this task can succeed, `DOCKERHUB_TOKEN` must exist as a repository secret on `buidangkhoa05/iKho` (see the spec's "Manual prerequisite" section). Ask the user to confirm they've added it before proceeding — if they haven't, stop here and wait.

- [ ] **Step 1: Push the accumulated commits to `origin/main`**

```bash
cd "D:/Workspace/iKho" && git push origin main
```

- [ ] **Step 2: Poll the triggered run and confirm the skip path works**

```bash
cd "D:/Workspace/iKho" && FULL_SHA=$(git rev-parse HEAD) && echo "$FULL_SHA"
```

Then poll (replace `<full-sha>` with the value printed above):

```bash
for i in $(seq 1 40); do
  RUN=$(curl -s "https://api.github.com/repos/buidangkhoa05/iKho/actions/runs?per_page=1&head_sha=<full-sha>")
  ID=$(echo "$RUN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.workflow_runs[0]?j.workflow_runs[0].id:'')})")
  if [ -n "$ID" ]; then
    STATUS=$(curl -s "https://api.github.com/repos/buidangkhoa05/iKho/actions/runs/$ID" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.status+' '+j.conclusion)})")
    echo "[$i] run $ID: $STATUS"
    case "$STATUS" in completed*) break ;; esac
  fi
  sleep 15
done
```

Expected: run completes with conclusion `success`. Fetch its jobs list and confirm `Publish <key> image` ran for all 11 matrix entries with conclusion `success`, and that the `Check whether this service is affected` step's log shows `should_publish=false` for each (since only `.github/workflows/ci.yml` changed — not any Nx-tracked project — nothing should be genuinely affected on this push). If any matrix job's `docker/login-action` or later steps actually executed here, something is wrong with the `should_publish` gating — stop and investigate.

- [ ] **Step 3: Confirm with the user before testing the real build+push path**

Pushing a version tag (e.g. `v0.0.1`) triggers `docker-publish` with `should_publish=true` unconditionally for all 11 services — this really builds and pushes 11 images to public Docker Hub repositories under `buidangkhoa05`, and creates a permanent-ish git tag. **Ask the user explicitly which tag name to use and for confirmation before doing this** — do not pick a version or push a tag without that confirmation.

- [ ] **Step 4: Push the confirmed tag and poll the run**

```bash
cd "D:/Workspace/iKho" && git tag <confirmed-tag> && git push origin <confirmed-tag>
```

Poll the same way as Step 2, using the new commit/tag's `head_sha` (the tag points at the current `HEAD`, so `git rev-parse HEAD` still gives the right value) to find the run.

Expected: run completes with conclusion `success`; all 11 `Publish <key> image` jobs show `should_publish=true` and a successful `docker/build-push-action@v6` step.

- [ ] **Step 5: Verify images landed on Docker Hub**

For at least 3 of the 11 repos (spot-check), confirm the pushed tag is visible via Docker Hub's public API:

```bash
for repo in ikho-api-gateway ikho-ui ikho-warehouse-organization; do
  echo "=== $repo ==="
  curl -s "https://hub.docker.com/v2/repositories/buidangkhoa05/$repo/tags/?page_size=10" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const j = JSON.parse(d);
      console.log((j.results||[]).map(t=>t.name).join(', '));
    });
  "
done
```

Expected: each repo lists the version tag pushed in Step 4 (e.g. `0.0.1` if the tag was `v0.0.1`).

- [ ] **Step 6: Report back to the user**

Summarize the run URL(s), which images now exist on Docker Hub, and the tags each carries. No commit for this task — it's verification only.
