using Konkursownik.Api.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Konkursownik.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<InviteCode> InviteCodes => Set<InviteCode>();
    public DbSet<Contest> Contests => Set<Contest>();
    public DbSet<ContestTask> Tasks => Set<ContestTask>();
    public DbSet<PurchaseItem> Purchases => Set<PurchaseItem>();
    public DbSet<ProofItem> Proofs => Set<ProofItem>();
    public DbSet<Entry> Entries => Set<Entry>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<Win> Wins => Set<Win>();

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

        builder.Entity<Contest>(e =>
        {
            e.Property(c => c.Id).ValueGeneratedNever();
            e.Property(c => c.OwnerId).IsRequired();
            e.HasOne<AppUser>().WithMany().HasForeignKey(c => c.OwnerId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(c => c.OwnerId);
            e.Property(c => c.Name).HasMaxLength(200);
            e.Property(c => c.PrizeValue).HasColumnType("decimal(10,2)");
            e.HasMany(c => c.Tasks).WithOne().HasForeignKey(t => t.ContestId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Purchases).WithOne().HasForeignKey(t => t.ContestId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Proofs).WithOne().HasForeignKey(t => t.ContestId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(c => c.Entries).WithOne(x => x.Contest).HasForeignKey(x => x.ContestId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(c => c.Win).WithOne().HasForeignKey<Win>(w => w.ContestId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<ContestTask>().Property(x => x.Id).ValueGeneratedNever();
        builder.Entity<PurchaseItem>().Property(x => x.Id).ValueGeneratedNever();
        builder.Entity<ProofItem>().Property(x => x.Id).ValueGeneratedNever();
        builder.Entity<Entry>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.PurchaseAmount).HasColumnType("decimal(10,2)");
            e.HasMany(x => x.Photos).WithOne().HasForeignKey(p => p.EntryId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<Photo>().Property(x => x.Id).ValueGeneratedNever();
        builder.Entity<Win>(e =>
        {
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasIndex(x => x.ContestId).IsUnique();
            e.Property(x => x.PrizeValue).HasColumnType("decimal(10,2)");
        });
    }
}
