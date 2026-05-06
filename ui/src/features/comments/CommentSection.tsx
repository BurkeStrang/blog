import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { lightgrey, accent } from "../../shared/theme/colors";
import { CommentItem } from "./CommentItem";
import { CommentForm } from "./CommentForm";
import {
  commentService,
  type Comment,
  type CreateCommentRequest,
} from "../../services/commentService";

const readableAccent = `color-mix(in srgb, ${accent} 65%, black)`;
const readableLightgrey = `color-mix(in srgb, ${lightgrey} 65%, black)`;

const SectionContainer = styled.section`
  width: 100%;
  border-top: 1px solid var(--color-comment-border);
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding-top: 1.5rem;
  }

  @media (max-width: 480px) {
    padding-top: 1rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding-top: 0.75rem;
  }
`;

const SectionTitle = styled.h2`
  color: ${readableAccent};
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 2rem;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.3rem;
    margin-bottom: 1.5rem;
  }

  @media (max-width: 480px) {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
`;

const CommentsList = styled.div`
  margin-bottom: 1rem;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    margin-bottom: 1.5rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 2rem;
  color: ${readableLightgrey};
  opacity: 0.7;
  font-size: 0.95rem;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    font-size: 0.9rem;
  }

  @media (max-width: 480px) {
    padding: 1.5rem 1rem;
    font-size: 0.85rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding: 1rem 0.75rem;
    font-size: 0.8rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #ff6b6b;
  font-size: 0.9rem;
  text-align: center;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
  color: ${readableLightgrey};
  opacity: 0.7;
`;

interface CommentSectionProps {
  postId: number;
  isAuthenticated: boolean;
  user?: import('../../shared/types/user').User | null;
  onLogin?: () => void;
  onCommentsLoad?: (total: number) => void;
}

const CommentSectionComponent: React.FC<CommentSectionProps> = ({
  postId,
  isAuthenticated,
  user,
  onLogin,
  onCommentsLoad,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to onCommentsLoad so loadComments doesn't depend on it.
  // This prevents the effect from re-running when the parent re-renders.
  const onCommentsLoadRef = useRef(onCommentsLoad);
  useEffect(() => { onCommentsLoadRef.current = onCommentsLoad; });

  const loadComments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedComments = await commentService.getComments(postId);
      const allComments = Array.isArray(fetchedComments) ? fetchedComments : [];

      const commentMap = new Map<number | string, Comment>();
      for (const c of allComments) {
        commentMap.set(c.id, { ...c, replies: [] });
      }

      const topLevel: Comment[] = [];
      for (const c of allComments) {
        const node = commentMap.get(c.id)!;
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id);
          if (parent) {
            parent.replies = [...(parent.replies || []), node];
          } else {
            topLevel.push(node);
          }
        } else {
          topLevel.push(node);
        }
      }

      setComments(topLevel);
      setTotalCount(allComments.length);
      onCommentsLoadRef.current?.(allComments.length);
    } catch (err) {
      console.error("Failed to load comments:", err);
      setError("Failed to load comments. Please try again later.");
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]); // Only re-creates when the post changes, not when parent re-renders

  const handleSubmitComment = React.useCallback(
    async (commentData: CreateCommentRequest) => {
      try {
        setSubmitting(true);
        setError(null);

        if (commentData.parent_id) {
          // Handle reply - use the reply endpoint
          await commentService.replyToComment(commentData.parent_id, {
            content: commentData.content,
          });
        } else {
          // Handle top-level comment
          const newComment = await commentService.createComment(commentData);
          setComments((prevComments) => [
            ...(Array.isArray(prevComments) ? prevComments : []),
            newComment,
          ]);
        }

        // Reload comments to get updated data with proper sorting
        // onCommentsLoad from loadComments() handles syncing the count
        await loadComments();
      } catch (err) {
        console.error("Failed to submit comment:", err);
        setError("Failed to post comment. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [loadComments],
  );

  const handleReply = React.useCallback(
    async () => {
      await loadComments();
    },
    [loadComments],
  );

  const handleDelete = React.useCallback(async () => {
    await loadComments();
  }, [loadComments]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  return (
    <SectionContainer>
      <SectionTitle>
        Comments {totalCount > 0 && `(${totalCount})`}
      </SectionTitle>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <CommentForm
        postId={postId}
        isAuthenticated={isAuthenticated}
        isSubmitting={submitting}
        onSubmit={handleSubmitComment}
        onLogin={onLogin}
      />

      <CommentsList>
        {loading ? (
          <LoadingSpinner>Loading comments...</LoadingSpinner>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isAuthenticated={isAuthenticated}
              user={user}
              onReply={handleReply}
              onLogin={onLogin}
              onUpdate={loadComments}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <EmptyState>
            No comments yet. Be the first to share your thoughts!
          </EmptyState>
        )}
      </CommentsList>
    </SectionContainer>
  );
};

export const CommentSection = React.memo(CommentSectionComponent);
