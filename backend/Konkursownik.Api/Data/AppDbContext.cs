using Konkursownik.Api.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<InviteCode> InviteCodes => Set<InviteCode>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<InviteCode>(e =>
        {
            e.HasKey(i => i.Code);
            e.Property(i => i.Code).HasMaxLength(16);
            e.HasOne<AppUser>().WithMany().HasForeignKey(i => i.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<AppUser>().WithMany().HasForeignKey(i => i.UsedByUserId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
