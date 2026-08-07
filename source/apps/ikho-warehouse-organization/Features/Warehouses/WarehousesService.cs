using System.Text.Json;
using Ikho.SharedLibrary.Outbox;
using Ikho.SchemaManagement.Contracts.WarehouseOrganization.Events.V1;
using Ikho.Warehouse.Organization.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Organization.Features.Warehouses;

/// <summary>
/// Result of a warehouse creation attempt, distinguishing the different ways it can fail so the
/// endpoint can return an accurate status code.
/// </summary>
public enum CreateWarehouseOutcome
{
    /// <summary>The warehouse was created successfully.</summary>
    Created,

    /// <summary>The referenced <c>CompanyId</c> does not exist.</summary>
    CompanyNotFound,

    /// <summary><c>Code</c> is already in use within the company.</summary>
    CodeAlreadyExists,
}

/// <summary>
/// Business logic for creating, updating, and reading warehouses. Publishes
/// <c>WarehouseCreated</c> on creation and <c>WarehouseStatusChanged</c> on activation toggles.
/// </summary>
public sealed class WarehousesService(IWarehouseRepository repository, IOutboxWriter outbox)
{
    /// <summary>
    /// Attempts to create a new warehouse. See <see cref="CreateWarehouseOutcome"/> for the
    /// possible failure reasons.
    /// </summary>
    public async Task<(CreateWarehouseOutcome Outcome, WarehouseResponse? Warehouse)> CreateAsync(
        CreateWarehouseRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        if (!await repository.CompanyExistsAsync(request.CompanyId, cancellationToken))
        {
            return (CreateWarehouseOutcome.CompanyNotFound, null);
        }

        if (await repository.CodeExistsAsync(request.CompanyId, request.Code, cancellationToken))
        {
            return (CreateWarehouseOutcome.CodeAlreadyExists, null);
        }

        var warehouse = new Domain.Warehouse
        {
            CompanyId = request.CompanyId,
            Code = request.Code,
            Name = request.Name,
        };

        repository.Add(warehouse);

        var @event = new WarehouseCreated
        {
            eventId = Guid.NewGuid().ToString(),
            warehouseId = warehouse.Id.ToString(),
            companyId = warehouse.CompanyId.ToString(),
            code = warehouse.Code,
            name = warehouse.Name,
            createdOn = warehouse.CreatedOnUtc.ToString("O"),
        };
        repository.Add(outbox.Enqueue(nameof(WarehouseCreated), JsonSerializer.Serialize(@event), correlationId));

        try
        {
            await repository.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index on (CompanyId, Code) caught a race with a concurrent create using
            // the same upfront-checked code; treat it the same as the pre-check failing.
            return (CreateWarehouseOutcome.CodeAlreadyExists, null);
        }

        return (CreateWarehouseOutcome.Created, WarehouseResponse.FromEntity(warehouse));
    }

    /// <summary>
    /// Updates an existing warehouse's display name. Returns <see langword="null"/> if the
    /// warehouse does not exist.
    /// </summary>
    public async Task<WarehouseResponse?> UpdateAsync(Guid id, UpdateWarehouseRequest request, CancellationToken cancellationToken)
    {
        var warehouse = await repository.GetByIdAsync(id, cancellationToken);
        if (warehouse is null)
        {
            return null;
        }

        warehouse.Name = request.Name;
        await repository.SaveChangesAsync(cancellationToken);

        return WarehouseResponse.FromEntity(warehouse);
    }

    /// <summary>
    /// Activates or deactivates a warehouse, publishing <c>WarehouseStatusChanged</c> when the
    /// status actually changes. Returns <see langword="null"/> if the warehouse does not exist.
    /// </summary>
    public async Task<WarehouseResponse?> SetStatusAsync(Guid id, SetWarehouseStatusRequest request, string? correlationId, CancellationToken cancellationToken)
    {
        var warehouse = await repository.GetByIdAsync(id, cancellationToken);
        if (warehouse is null)
        {
            return null;
        }

        if (warehouse.IsActive != request.IsActive)
        {
            warehouse.IsActive = request.IsActive;

            var @event = new WarehouseStatusChanged
            {
                eventId = Guid.NewGuid().ToString(),
                warehouseId = warehouse.Id.ToString(),
                isActive = warehouse.IsActive,
                changedOn = DateTimeOffset.UtcNow.ToString("O"),
            };
            repository.Add(outbox.Enqueue(nameof(WarehouseStatusChanged), JsonSerializer.Serialize(@event), correlationId));
        }

        await repository.SaveChangesAsync(cancellationToken);

        return WarehouseResponse.FromEntity(warehouse);
    }

    /// <summary>
    /// Returns a single warehouse by id, or <see langword="null"/> if it does not exist.
    /// </summary>
    public async Task<WarehouseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var warehouse = await repository.GetByIdAsync(id, cancellationToken);
        return warehouse is null ? null : WarehouseResponse.FromEntity(warehouse);
    }

    /// <summary>
    /// Returns all warehouses, optionally filtered by <paramref name="companyId"/>.
    /// </summary>
    public async Task<IReadOnlyList<WarehouseResponse>> GetAllAsync(Guid? companyId, CancellationToken cancellationToken)
    {
        var warehouses = await repository.GetAllAsync(companyId, cancellationToken);
        return warehouses.Select(WarehouseResponse.FromEntity).ToList();
    }
}
