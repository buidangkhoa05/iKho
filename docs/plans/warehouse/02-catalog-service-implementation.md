# Catalog Service Implementation

This document plans the implementation of `Ikho.WarehouseCatalog`, the service that owns product master data and product classification.

## Goals

1. Create the authoritative product catalog for warehouse operations.
2. Support category, brand, UOM, barcode, and variant management.
3. Publish product metadata used by Inventory, Inbound, Outbound, Returns, and Reporting.

## Architecture

This service follows **Vertical Slice Architecture** (mandatory for all `Ikho.Warehouse*`
services — see [csharp.instructions.md](../../../.github/instructions/csharp.instructions.md)
and [warehouse-service-template.md](../../architecture/warehouse-service-template.md)):

1. Each feature lives under `Features/{Feature}/`, owning its endpoint, service, repository,
   request/response DTOs, and validator — no `Controllers/`, `Services/`, or `Repositories/`
   layer folders.
2. Cross-cutting/local concerns live in `Shared/`; shared domain types live in `Domain/`.
3. Bootstraps via `Ikho.SharedLibrary` (`AddServiceDefaults<TDbContext>()` /
   `UseServiceDefaults()`) for correlation ids, request logging, health checks, outbox
   publishing, and idempotency.

## Owned Entities

1. `Product`
2. `Category`
3. `Brand`
4. `UnitOfMeasure`
5. `ProductVariant`
6. `ProductAttributeDefinition`
7. `ProductAttributeValue`
8. `Barcode`

## Database Scope

The Catalog database stores only product master data. It does not store stock balances, order allocations, or receiving outcomes.

## Initial API Surface

1. Create and update product.
2. Create and update category and brand.
3. Manage product variants and barcodes.
4. Manage product tracking flags such as lot-controlled and serial-controlled.
5. Query product details by `ProductId` or `Sku`.

## Events

Publishes:

1. `ProductCreated`
2. `ProductUpdated`
3. `ProductStatusChanged`
4. `ProductTrackingPolicyChanged`
5. `CategoryCreated`, `CategoryUpdated`
6. `BrandCreated`, `BrandUpdated`

Consumes:

1. None required for the first slice.

## Execution Steps

1. Define the `Product` aggregate and supporting lookup entities.
2. Implement product creation and update workflows.
3. Add barcode and variant handling.
4. Publish product and policy change events.
5. Document required snapshot fields for downstream services.

## Dependencies

1. Foundation and platform plan complete.

## Verification

1. Products can be created with tracking metadata.
2. SKU lookups return the fields needed by operational services.
3. Product events expose contract-stable identifiers and tracking flags.

## Out Of Scope

1. Pricing engine.
2. Promotions.
3. Rich media and storefront content.
