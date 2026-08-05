---
name: dotnet-design-pattern-review
description: Review C#/.NET code for design-pattern implementation and suggest improvements, without making changes. Use when the user asks for a design/architecture review of a .NET file, feature slice, or the current diff.
---

# .NET/C# Design Pattern Review

Review the C#/.NET code the user points at — a file, folder, feature slice, or (if nothing is specified) the current uncommitted diff (`git diff`) — for design-pattern implementation and suggest improvements. **Do not make any changes to the code, just provide a review.**

This repo (see root `CLAUDE.md`) uses Minimal APIs with Vertical Slice Architecture, not a CLI command-handler or Semantic Kernel style codebase — judge findings against the patterns actually in use here, listed below.

## Patterns to check for (iKho conventions)

- **Vertical Slice Architecture**: each feature lives under `Features/{Feature}/` and owns its endpoint mapping, service, repository, and DTOs. Slices should not reach into each other directly.
- **Minimal API endpoint groups**: `app.MapGroup("/api/{feature}").MapFeatureEndpoints()`, top-level static methods/lambdas, no MVC controllers.
- **DTOs as records**: immutable request/response records, not mutable classes.
- **Result pattern**: `TypedResults.Ok(...)` / `TypedResults.NotFound()` etc. for typed, discoverable responses.
- **Repository pattern**: async data-access interfaces behind the service layer.
- **Dependency Injection**: constructor injection, services registered in `Program.cs` via `builder.Services.Add*`, proper lifetimes (Scoped/Singleton/Transient).
- **Provider pattern**: for external service abstractions (database, messaging, AI) with clear contracts.
- **Nullable reference types**: non-nullable by default, `is null` / `is not null` checks at entry points only where the type system doesn't already guarantee non-null.

## Review Checklist

- **Design Patterns**: Which patterns are used? Are Repository, Provider, and DI correctly implemented? Is Vertical Slice Architecture respected, or is logic leaking across feature boundaries? Any beneficial pattern missing?
- **Architecture**: Correct placement — deployable service under `source/apps/`, shared/build-time-only code under `source/libs/`? Modular and readable?
- **.NET Best Practices**: async/await with `Task` returns, structured logging, strongly-typed configuration, `TypedResults`?
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion violations?
- **Performance**: proper async/await, resource disposal, avoidable allocations, parallel-processing opportunities?
- **Maintainability**: clear separation of concerns, consistent error handling, proper configuration usage?
- **Testability**: dependencies abstracted via interfaces, mockable components, async-testable, AAA-pattern compatible (matches `xUnit` + `WebApplicationFactory<Program>` convention)?
- **Security**: input validation, secure credential handling, parameterized queries, safe exception handling?
- **Documentation**: XML docs for public APIs where warranted?
- **Code Clarity**: meaningful, domain-reflecting names; self-explanatory structure?
- **Clean Code**: consistent style, appropriately sized methods/classes, minimal complexity, no duplication?

## Improvement Focus Areas

- **Endpoints**: validation, consistent error/problem-details responses, route grouping.
- **Services**: business logic isolation from transport/data-access concerns.
- **Repositories**: connection management, async patterns, exception handling and logging.
- **Configuration**: data annotations/validation, secure handling of sensitive values.

Provide specific, actionable recommendations aligned with this project's architecture and .NET best practices. Do not edit files as part of this review.
