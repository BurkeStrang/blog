import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { readableLightgrey, accent, backgroundColor } from '../../shared/theme/colors';
import { commentService, type Comment } from '../../services/commentService';
import { CommentForm } from './CommentForm';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOutlinedIcon from '@mui/icons-material/ThumbUpOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { User } from '../../shared/types/user';

const readableAccent = `color-mix(in srgb, ${accent} 65%, black)`;

const CommentContainer = styled.div`
  background: var(--color-comment-bg);
  border: 1px solid var(--color-comment-border);
  border-radius: 8px;
  padding: 0.875rem 1rem;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
  word-wrap: break-word;
  overflow-wrap: break-word;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  &:hover {
    background: var(--color-comment-bg-hover);
    border-color: var(--color-comment-border-hover);
  }

  @media (max-width: 768px) {
    padding: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.625rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding: 0.5rem;
    margin-bottom: 0.375rem;
    border-radius: 6px;
  }
`;

const CommentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    margin-bottom: 0.5rem;
  }
`;

const AuthorName = styled.span`
  color: ${readableAccent};
  font-weight: 600;
  font-size: 0.9rem;
  word-wrap: break-word;
  overflow-wrap: break-word;
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    font-size: 0.8rem;
  }
`;

const CommentTime = styled.span`
  color: ${readableLightgrey};
  font-size: 0.8rem;
  opacity: 0.7;
`;

const CommentContent = styled.div`
  color: ${readableLightgrey};
  line-height: 1.6;
  font-size: 0.95rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  
  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    font-size: 0.85rem;
    line-height: 1.5;
  }
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    font-size: 0.8rem;
    line-height: 1.4;
  }
`;

const CommentActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  background: none;
  border: none;
  color: ${props => props.$active ? readableAccent : readableLightgrey};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: inherit;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${readableAccent};
    background: rgba(255, 255, 255, 0.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    font-size: 0.9rem;
  }
`;

const RepliesContainer = styled.div`
  margin-top: 0.5rem;
  padding-left: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding-left: 0.875rem;
  }

  @media (max-width: 480px) {
    padding-left: 0.75rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding-left: 0.5rem;
    margin-top: 0.375rem;
  }
`;

const ReplyItem = styled.div`
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
`;

const ReplyFormContainer = styled.div`
  margin-top: 1rem;
  padding-left: 1.5rem;

  @media (max-width: 768px) {
    padding-left: 1.25rem;
  }

  @media (max-width: 480px) {
    padding-left: 1rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding-left: 0.75rem;
    margin-top: 0.75rem;
  }
`;

const EditTextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  color: ${readableLightgrey};
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  min-height: 80px;
  resize: vertical;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${accent};
    background: var(--color-input-bg-focus);
  }
`;

const EditActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  padding: 0.5rem 1rem;
  background: ${accent};
  color: ${backgroundColor};
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: ${readableLightgrey};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  [data-theme="light"] & {
    border-color: rgba(28, 31, 46, 0.35);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${accent};
    color: ${readableAccent};
  }
`;

const DeleteConfirmOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const DeleteConfirmDialog = styled.div`
  background: var(--color-bg);
  border: 1px solid var(--color-input-border-secondary);
  padding: 1.5rem;
  border-radius: 12px;
  max-width: 380px;
  width: 88%;
  box-sizing: border-box;

  @media (max-width: 480px) {
    width: 92%;
    padding: 1.25rem;
    border-radius: 10px;
  }
`;

const DeleteConfirmTitle = styled.h3`
  color: #ff4444;
  margin-bottom: 1rem;
  font-size: 1.25rem;
`;

const DeleteConfirmMessage = styled.p`
  color: ${readableLightgrey};
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const DeleteConfirmActions = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
`;

const ConfirmDeleteButton = styled.button`
  padding: 0.5rem 1rem;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  [data-theme="light"] & {
    border: 1px solid rgba(28, 31, 46, 0.22);
  }

  &:hover {
    background: #ff3333;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

interface CommentItemProps {
  comment: Comment;
  isAuthenticated?: boolean;
  user?: User | null;
  onReply?: (parentId: number | string, reply: Comment) => void;
  onLogin?: () => void;
  isReply?: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const commentDate = new Date(dateString);
  const diffMs = now.getTime() - commentDate.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For older comments, show the date
  return commentDate.toLocaleDateString();
};

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isAuthenticated = false,
  user,
  onReply,
  onLogin,
  isReply = false,
  onUpdate,
  onDelete
}) => {
  const [userLiked, setUserLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.like_count || 0);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if current user is the comment author (compare usernames, not display names)
  // Strip email domain from username for comparison (e.g., "user@gmail.com" -> "user")
  const currentUsername = user?.username ? user.username.split('@')[0] : '';
  const isAuthor = currentUsername === comment.author;

  // Load like status on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadLikeStatus();
    }
  }, [comment.id, isAuthenticated]);

  const loadLikeStatus = async () => {
    try {
      const response = await commentService.getCommentLikes(comment);
      console.log('Loaded like status:', {
        commentId: comment.id,
        userLiked: response.user_liked,
        likeCount: response.like_count
      });
      setUserLiked(response.user_liked);
      setLikeCount(response.like_count);
    } catch (error) {
      console.error('Failed to load like status:', error);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      onLogin?.();
      return;
    }

    setLoading(true);
    const previousLiked = userLiked;
    const previousCount = likeCount;

    console.log('handleLike called:', {
      commentId: comment.id,
      currentUserLiked: userLiked,
      action: userLiked ? 'unlike' : 'like'
    });

    try {
      if (userLiked) {
        // Optimistically update UI
        setUserLiked(false);
        setLikeCount(prev => prev - 1);
        await commentService.unlikeComment(comment);
      } else {
        // Optimistically update UI
        setUserLiked(true);
        setLikeCount(prev => prev + 1);
        await commentService.likeComment(comment);
      }
      console.log('Like toggle successful');
    } catch (error) {
      console.error('Failed to toggle like:', error);

      // Revert optimistic update
      console.log('Reverting optimistic update and reloading from server');
      setUserLiked(previousLiked);
      setLikeCount(previousCount);

      // Reload like status from server to sync state
      await loadLikeStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleReplySubmit = async (replyData: { content: string }) => {
    try {
      const reply = await commentService.replyToComment(comment, replyData);
      onReply?.(comment.id, reply);
      setShowReplyForm(false);
    } catch (error) {
      console.error('Failed to submit reply:', error);
    }
  };

  const handleEdit = () => {
    setEditContent(comment.content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    setIsSaving(true);
    try {
      await commentService.updateComment(comment, editContent);
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await commentService.deleteComment(comment);
      setShowDeleteConfirm(false);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <CommentContainer>
      <CommentHeader>
        <AuthorName>{comment.author}</AuthorName>
        <CommentTime>{formatTimeAgo(comment.created_at)}</CommentTime>
      </CommentHeader>

      {isEditing ? (
        <>
          <EditTextArea
            autoFocus
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSaving && editContent.trim()) {
                e.preventDefault();
                handleSaveEdit();
              }
            }}
            placeholder="Edit your comment..."
          />
          <EditActions>
            <CancelButton onClick={handleCancelEdit}>Cancel</CancelButton>
            <SaveButton onClick={handleSaveEdit} disabled={isSaving || !editContent.trim()}>
              {isSaving ? 'Saving...' : 'Save'}
            </SaveButton>
          </EditActions>
        </>
      ) : (
        <>
          <CommentContent>{comment.content}</CommentContent>

          <CommentActions>
            <ActionButton
              $active={userLiked}
              onClick={handleLike}
              disabled={loading}
            >
              {userLiked ? <ThumbUpIcon /> : <ThumbUpOutlinedIcon />}
              {likeCount > 0 && likeCount}
            </ActionButton>

            {!isReply && (
              <ActionButton onClick={() => setShowReplyForm(!showReplyForm)}>
                <ReplyIcon />
                Reply
              </ActionButton>
            )}

            {isAuthor && isAuthenticated && (
              <>
                <ActionButton onClick={handleEdit}>
                  <EditIcon />
                  Edit
                </ActionButton>
                <ActionButton onClick={handleDeleteClick}>
                  <DeleteIcon />
                  Delete
                </ActionButton>
              </>
            )}
          </CommentActions>
        </>
      )}

      {/* Show replies */}
      {comment.replies && comment.replies.length > 0 && (
        <RepliesContainer>
          {comment.replies.map((reply) => (
            <ReplyItem key={reply.id}>
              <CommentItem
                comment={reply}
                isAuthenticated={isAuthenticated}
                user={user}
                onLogin={onLogin}
                isReply={true}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </ReplyItem>
          ))}
        </RepliesContainer>
      )}

      {/* Reply form */}
      {showReplyForm && !isEditing && (
        <ReplyFormContainer>
          <CommentForm
            postId={comment.post_id}
            parentId={comment.id}
            isAuthenticated={isAuthenticated}
            isSubmitting={false}
            onSubmit={handleReplySubmit}
            onLogin={onLogin}
            placeholder={`Reply to ${comment.author}...`}
          />
        </ReplyFormContainer>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <DeleteConfirmOverlay onClick={handleDeleteCancel}>
          <DeleteConfirmDialog onClick={(e) => e.stopPropagation()}>
            <DeleteConfirmTitle>Delete Comment</DeleteConfirmTitle>
            <DeleteConfirmMessage>
              Are you sure you want to delete this comment? This action cannot be undone.
            </DeleteConfirmMessage>
            <DeleteConfirmActions>
              <CancelButton onClick={handleDeleteCancel}>Cancel</CancelButton>
              <ConfirmDeleteButton onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </ConfirmDeleteButton>
            </DeleteConfirmActions>
          </DeleteConfirmDialog>
        </DeleteConfirmOverlay>
      )}
    </CommentContainer>
  );
};
