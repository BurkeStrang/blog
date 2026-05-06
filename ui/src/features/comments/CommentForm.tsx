import React, { useState } from 'react';
import styled from 'styled-components';
import { lightgrey, accent, backgroundColor} from '../../shared/theme/colors';
import type { CreateCommentRequest } from '../../services/commentService';

const readableAccent = `color-mix(in srgb, ${accent} 65%, black)`;
const readableLightgrey = `color-mix(in srgb, ${lightgrey} 65%, black)`;

const FormContainer = styled.div`
  background: var(--color-comment-bg);
  border: 0.1rem solid var(--color-comment-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    padding: 0.75rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem;
  }
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding: 0.3rem;
    margin-bottom: 1.5rem;
    border-radius: 6px;
  }
`;

const FormTitle = styled.h3`
  color: ${readableAccent};
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 1rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border);
  border-radius: 6px;
  color: ${readableLightgrey};
  font-size: 0.95rem;
  line-height: 1.5;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;

  &::placeholder {
    color: ${readableLightgrey};
    opacity: 0.6;
  }

  &:focus {
    outline: none;
    border-color: ${accent};
    background: var(--color-input-bg-focus);
  }
  
  @media (max-width: 768px) {
    padding: 0.875rem;
    font-size: 1rem;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
    font-size: 1rem;
    min-height: 100px;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding: 0.5rem;
    font-size: 1rem;
    min-height: 80px;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid ${props => props.$variant === 'primary' ? accent : 'var(--color-input-border-secondary)'};
  border-radius: 6px;
  background: ${props => props.$variant === 'primary' ? accent : 'transparent'};
  color: ${props => props.$variant === 'primary' ? backgroundColor : readableLightgrey};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-1px);
    background: ${props => props.$variant === 'primary' ? accent : 'var(--color-input-bg)'};
    border-color: ${accent};
  }
  
  &:active {
    transform: translateY(0);
  }
  
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 768px) {
    padding: 0.625rem 1.25rem;
    font-size: 0.85rem;
  }
  
  @media (max-width: 480px) {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
  }
  
  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.75rem;
  }
`;

const LoginPrompt = styled.div`
  text-align: center;
  padding: 2rem;
  color: ${readableLightgrey};
  font-size: 0.95rem;
  
  a {
    color: ${readableAccent};
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

interface CommentFormProps {
  postId: number;
  parentId?: number | string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  onSubmit: (comment: CreateCommentRequest) => void;
  onLogin?: () => void;
  placeholder?: string;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  isAuthenticated,
  isSubmitting,
  onSubmit,
  onLogin,
  placeholder = "Share your thoughts about this post...",
}) => {
  const [content, setContent] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content.trim() && !isSubmitting) {
        onSubmit({
          post_id: postId,
          content: content.trim(),
          parent_id: parentId,
        });
        setContent('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim() && !isSubmitting) {
      onSubmit({
        post_id: postId,
        content: content.trim(),
        parent_id: parentId,
      });
      setContent('');
    }
  };

  const handleCancel = () => {
    setContent('');
  };

  if (!isAuthenticated) {
    return (
      <FormContainer>
        <LoginPrompt>
          Please <a href="#" onClick={(e) => { e.preventDefault(); onLogin?.(); }}>sign in</a> to leave a comment.
        </LoginPrompt>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <FormTitle>{parentId ? 'Reply' : 'Leave a Comment'}</FormTitle>
      <form onSubmit={handleSubmit}>
        <TextArea
          id={`comment-${postId}${parentId ? `-reply-${parentId}` : ''}`}
          name="comment"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSubmitting}
        />
        <ButtonContainer>
          <Button 
            type="button" 
            $variant="secondary" 
            onClick={handleCancel}
            disabled={isSubmitting || !content.trim()}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            $variant="primary"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </ButtonContainer>
      </form>
    </FormContainer>
  );
};
