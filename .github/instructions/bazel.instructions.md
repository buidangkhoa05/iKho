---
description: 'Instructions for writing Bazel build files'
applyTo: '**/BUILD, **/BUILD.bazel, **/WORKSPACE, **/WORKSPACE.bazel, **/.bzl'
---

# Bazel Monorepo Development Instructions
Instructions for building, maintaining, and scaling a high-performance Bazel monorepo, integrating polyglot services and modern build practices following the official Bazel documentation at https://bazel.build.

Project Context
Modern Bazel configuration (Bzlmod enabled via MODULE.bazel)

Polyglot environment containing backend services (.NET, Golang) and frontend applications (React)

Infrastructure managed alongside code (Kubernetes, Helm)

Strictly hermetic, reproducible, and deterministic builds

Focus on remote caching and highly parallelized execution

Development Standards
Monorepo Architecture
Enforce strict dependency boundaries between domains and services

Follow the 1:1:1 rule where practical: one directory = one package = one BUILD.bazel file

Keep targets highly granular to maximize caching and minimize rebuilds

Maintain shared libraries in dedicated, highly-visible internal packages

Never allow circular dependencies between packages

Use visibility = ["//visibility:private"] by default, exposing targets explicitly only when required

Build System (Bazel) Integration
Use rules_go, rules_dotnet, and aspect_rules_js as the primary language rulesets

Ensure all build actions are perfectly hermetic (no dependencies on host system tools)

Avoid using glob() for source files in BUILD files to prevent unnecessary cache invalidation

Consolidate boilerplate code into custom .bzl macros to keep BUILD files declarative and clean

Manage all external dependencies through MODULE.bazel (Bzlmod) rather than the legacy WORKSPACE file

Target Design & Granularity
Name targets consistently based on their directory or primary output

Never include version numbers in internal target names

Separate library targets (_lib) from binary targets (_bin) and test targets (_test)

Explicitly declare all inputs, outputs, and dependencies for custom genrules

Use filegroup to bundle related static assets cleanly

Polyglot Backend (.NET & Golang)
Golang: Use gazelle to automatically generate and update BUILD.bazel files for Go code

Golang: Keep Go modules idiomatic and ensure external dependencies are mirrored in Bazel

.NET: Use Minimal APIs for lightweight services

.NET: Carefully manage external NuGet packages via Bazel rules to prevent version conflicts

.NET: Ensure AsyncLocal context and threading configurations are hermetically testable

Frontend (React)
Run React builds through Bazel using `aspect_rules_js` and `aspect_rules_ts`

Structure React feature modules to map cleanly to Bazel packages

Use `ts_project` for TypeScript compilation and `js_library` / `js_run_binary` for bundling

Run Vitest tests through Bazel's `bazel test` runner for isolated execution

Use Vite as the build tool, invoked via `js_run_binary` targets

Database Integration
Rely on strongly typed data models in backend services for database interactions

Write hermetic integration tests that spin up ephemeral database instances or use strict mocking

Ensure database client libraries are properly managed through Bazel dependency rules

Infrastructure (Kubernetes & Helm)
Use rules_oci (or modern equivalents) to build deterministic container images directly from Bazel targets without requiring a Docker daemon

Maintain Helm charts alongside the services they deploy

Use Bazel to template and validate Kubernetes manifests during the CI phase

Build Performance & Caching
Leverage remote execution and caching aggressively

Optimize target sizes; overly large targets bottleneck the critical path

Use bazel analyze-profile to identify and resolve build bottlenecks

Ensure external dependencies are fetched efficiently and cached properly

Testing
Write purely hermetic tests; tests must not access the external network unless explicitly tagged

Properly categorize tests using size = "small", "medium", or "large" to allocate correct timeouts and resources

Handle flaky tests by fixing the root cause (usually state leakage or race conditions), not by adding arbitrary retries

Generate code coverage reports centrally using Bazel's coverage commands

Tooling & Linting
Always format Bazel files (BUILD.bazel, WORKSPACE, .bzl) using buildifier

Enforce standard formatting for source code (gofmt for Go, dotnet format for C#, prettier/eslint for React) via Bazel linting rules

Integrate formatting checks directly into the Bazel test graph

Implementation Process
Define external module dependencies and toolchains in MODULE.bazel

Create directories for new services or libraries

Write source code and tests concurrently

Use automation (like Gazelle for Go) to generate initial BUILD.bazel targets

Manually refine targets for .NET and React components

Run buildifier to ensure Bazel files meet formatting standards

Run bazel build //path/to/target/... to verify compilation

Run bazel test //path/to/target/... to verify logic and hermeticity

Create container image targets using rules_oci

Define Helm charts and Kubernetes manifests for the new targets

Run cross-service integration tests

Submit code, ensuring CI passes purely out of the Bazel cache where applicable

Additional Guidelines
Document custom Bazel macros extensively using docstrings

Keep the MODULE.bazel file organized and logically grouped

Use bazel query and bazel cquery to understand dependency graphs before refactoring

Avoid checking in large binaries; rely on Bazel to fetch them from trusted remote repositories

Maintain a clean git history with descriptive commit messages referencing affected Bazel packages

Common Patterns
Stamping: Injecting git commit hashes and build metadata into binaries during bazel build without invalidating the cache

Custom Macros: Wrapping standard go_binary or csharp_binary with company-specific defaults

Runfiles: Accessing static configuration files or test data at runtime using Bazel's runfiles library

Aspects: Using Bazel aspects to generate IDE project files (e.g., for VSCode or IntelliJ) or run custom linters across the entire dependency graph

Multirun: Using rules like rules_multirun to launch multiple microservices simultaneously for local development