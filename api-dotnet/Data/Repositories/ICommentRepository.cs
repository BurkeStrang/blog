using BlogApi.Data.Entities;

namespace BlogApi.Data.Repositories;

public interface ICommentRepository
{
    Task<IReadOnlyList<Comment>> ListByPostAsync(string postId, CancellationToken cancellationToken);
    Task<Comment?> GetAsync(string postId, string commentId, CancellationToken cancellationToken);
    Task<Comment?> FindByIdCrossPartitionAsync(string commentId, CancellationToken cancellationToken);
    Task<int> CountByPostAsync(string postId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CommentLike>> ListLikesByCommentAsync(string postId, string commentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CommentLike>> ListLikesCrossPartitionByCommentAsync(string commentId, CancellationToken cancellationToken);
    Task<CommentLike?> FindLikeAsync(string postId, string commentId, string username, CancellationToken cancellationToken);

    Task AddCommentAsync(Comment comment, CancellationToken cancellationToken);
    Task UpdateCommentAsync(Comment comment, CancellationToken cancellationToken);
    Task DeleteCommentAsync(Comment comment, CancellationToken cancellationToken);
    Task AddLikeAsync(CommentLike like, CancellationToken cancellationToken);
    Task DeleteLikeAsync(CommentLike like, CancellationToken cancellationToken);
}
