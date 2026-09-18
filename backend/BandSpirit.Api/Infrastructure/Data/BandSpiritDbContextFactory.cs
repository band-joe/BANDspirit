using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BandSpirit.Api.Infrastructure.Data;

/// <summary>
/// Design-time factory für BandSpiritDbContext. Wird von EF-Tools (dotnet ef migrations)
/// verwendet, um zur Design-Zeit einen DbContext zu erstellen.
/// </summary>
public class BandSpiritDbContextFactory : IDesignTimeDbContextFactory<BandSpiritDbContext>
{
    public BandSpiritDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<BandSpiritDbContext>();
        
        // Dummy-Connection-String für Design-Time (wird nicht verwendet, nur zum Build nötig)
        optionsBuilder.UseNpgsql("Host=localhost;Database=bandspirit;Username=bandspirit;Password=dummy");
        
        // Erstelle DbContext mit dem einfachen Konstruktor (ohne IHttpContextAccessor)
        return new BandSpiritDbContext(optionsBuilder.Options);
    }
}
