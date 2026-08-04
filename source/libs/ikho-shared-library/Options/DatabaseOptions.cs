namespace Ikho.SharedLibrary.Options;

/// <summary>
/// Database connection settings, bound from the <c>Database</c> configuration section.
/// Each warehouse service owns its own PostgreSQL database (database-per-service), but
/// shares this options shape so configuration binding is consistent.
/// </summary>
public sealed class DatabaseOptions
{
    /// <summary>
    /// The configuration section name this options type binds to.
    /// </summary>
    public const string SectionName = "Database";

    /// <summary>
    /// The PostgreSQL connection string for the owning service's database.
    /// </summary>
    public string ConnectionString { get; set; } = string.Empty;
}
