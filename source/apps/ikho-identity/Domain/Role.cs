namespace Ikho.Identity.Domain;

/// <summary>An iKho-defined role, independent of the identity provider's own role feature.</summary>
public sealed class Role
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Stable, unique role name (see <see cref="RoleNames"/>).</summary>
    public string Name { get; set; } = string.Empty;
}

/// <summary>Well-known seeded role names.</summary>
public static class RoleNames
{
    public const string Office = "Office";
    public const string Operator = "Operator";
}
