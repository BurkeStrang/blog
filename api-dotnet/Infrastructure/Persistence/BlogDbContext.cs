using BlogApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlogApi.Infrastructure.Persistence;

public sealed class BlogDbContext : DbContext
{
    public BlogDbContext(DbContextOptions<BlogDbContext> options) : base(options) { }

    public DbSet<Post> Posts => Set<Post>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<CommentLike> CommentLikes => Set<CommentLike>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
    public DbSet<NotificationState> NotificationStates => Set<NotificationState>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Post>(b =>
        {
            b.ToContainer("posts");
            b.HasPartitionKey(p => p.Type);
            b.HasKey(p => p.Id);
            b.HasDiscriminator(p => p.Type).HasValue("post");
        });

        modelBuilder.Entity<CommentContainerDocument>(b =>
        {
            b.ToContainer("comments");
            b.HasPartitionKey(c => c.PostId);
            b.HasKey(c => c.Id);
            b.HasDiscriminator(c => c.Type)
                .HasValue<Comment>("comment")
                .HasValue<CommentLike>("comment_like");
        });

        modelBuilder.Entity<UserContainerDocument>(b =>
        {
            b.ToContainer("users");
            b.HasPartitionKey(u => u.Username);
            b.HasKey(u => u.Id);
            b.HasDiscriminator(u => u.Type)
                .HasValue<User>("user")
                .HasValue<UserPreferences>("user_preferences")
                .HasValue<NotificationState>("notification_state");
        });

        // Map C# PascalCase property names to camelCase JSON keys so the existing
        // Cosmos documents (id, type, postId, createdAt, …) round-trip correctly.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                var name = property.Name;
                if (string.IsNullOrEmpty(name) || char.IsLower(name[0]))
                {
                    continue;
                }
                property.SetJsonPropertyName(char.ToLowerInvariant(name[0]) + name[1..]);
            }
        }
    }
}
