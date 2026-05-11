import React, { useEffect, useState, useRef } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Post } from "../../app/AppContent";
import styled from "styled-components";
import { backgroundColor, lightgrey, accent } from "../../shared/theme/colors";
import { usePostsData } from "../../shared/contexts/SearchContext";
import { useAuth } from "../../shared/contexts/AuthContext";
import { CommentSection } from "../comments";
import { apiService } from "../../services/api";
import { isAdmin } from "../../shared/types/user";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { MarkdownContent } from "./MarkdownContent";

const Article = styled.article`
  width: calc(100vw - 0.75rem);
  height: 100vh;
  height: 100svh;
  padding: 1.75rem 1rem 3rem 2rem;
  padding-right: 2.75rem;
  margin: 0 0.75rem 0 0;
  background: transparent;
  font-family: var(--font-family);
  position: relative;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
  scrollbar-gutter: stable;
  scrollbar-width: auto;
  scrollbar-color: auto;

  @supports not selector(::-webkit-scrollbar) {
    scrollbar-color: transparent transparent;
  }
  &.scrollbar-visible {
    @supports not selector(::-webkit-scrollbar) {
      scrollbar-color: var(--color-post-scrollbar-thumb) transparent;
    }
  }

  &::-webkit-scrollbar {
    width: 1.1rem;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
    border: 0.14rem solid ${backgroundColor};
    border-radius: 999px;
    min-height: 3rem;
  }

  &.scrollbar-visible::-webkit-scrollbar-thumb {
    background-color: var(--color-post-scrollbar-thumb);
  }

  &.scrollbar-visible::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-post-scrollbar-thumb-hover);
  }

  /* Center the content within the full-width container */
  display: flex;
  flex-direction: column;
  align-items: center;

  /* Ensure child elements respect the max-width */
  > * {
    width: 100%;
    max-width: 1000px;
    box-sizing: border-box;
  }

  @media (max-width: 768px) {
    width: calc(100vw - 0.65rem);
    margin-right: 0.65rem;
    padding: 1.5rem 1.5rem 5rem 1.5rem;
    padding-right: 2.25rem;

    > * {
      max-width: 100%;
    }
  }

  @media (max-width: 480px) {
    width: calc(100vw - 0.55rem);
    margin-right: 0.55rem;
    padding: 1.25rem 1.25rem 4.5rem 1.25rem;
    padding-right: 2rem;
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    padding: 1rem 1rem 4rem 1rem;
    padding-right: 1.75rem;
    width: calc(100vw - 0.45rem);
    margin-right: 0.45rem;

    > * {
      max-width: 100%;
      width: 100%;
    }
  }
`;

const PostFrame = styled.div`
  position: relative;
  width: 100%;
  margin: 0.5rem auto 1rem auto;
`;

const PostBackdrop = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;

  --grid-size: 480px;

  background-color: ${backgroundColor};

  background-image:
    linear-gradient(rgba(0, 220, 200, 0.105) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 220, 200, 0.105) 1px, transparent 1px),
    repeating-linear-gradient(
      to bottom,
      rgba(0, 220, 200, 0.025) 0,
      rgba(0, 220, 200, 0.025) 1px,
      transparent 1px,
      transparent 5px
    );

  background-size:
    var(--grid-size) var(--grid-size),
    var(--grid-size) var(--grid-size),
    auto;

  @media (max-width: 700px) {
    --grid-size: 220px;
  }
`;

const Content = styled.div`
  color: ${lightgrey};
  line-height: 1.8;
  font-size: 1.125rem;
  text-align: left;
  padding: clamp(1.4rem, 3vw, 2.4rem);
  width: 100%;
  box-sizing: border-box;
  overflow-wrap: break-word;
  word-wrap: break-word;

  > * + * {
    margin-top: 1em;
  }

  p {
    margin-bottom: 1.5em;
  }

  h2,
  h3,
  h4,
  h5,
  h6 {
    color: ${accent};
    font-weight: 600;
    margin-top: 2em;
    margin-bottom: 1em;
    text-align: left;
  }

  h2 {
    font-size: 1.5em;
  }
  h3 {
    font-size: 1.3em;
  }
  h4 {
    font-size: 1.1em;
  }

  blockquote {
    border-left: 4px solid ${accent};
    padding-left: 1.5rem;
    margin: 2rem 0;
    font-style: italic;
    color: ${accent};
    text-align: left;
  }

  ul,
  ol {
    text-align: left;
    padding-left: 2rem;
    margin: 1.5rem 0;
  }

  li {
    margin-bottom: 0.5em;
  }

  a {
    color: #4a7ba7;
    text-decoration: none;
    transition: all 0.2s ease;
    word-break: break-word;
    border-bottom: 1px solid rgba(74, 123, 167, 0.3);

    &:hover {
      color: #3d5e8c;
      border-bottom-color: #3d5e8c;
    }
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.7;
    max-width: 100%;

    ul,
    ol {
      padding-left: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    font-size: 1rem;
    line-height: 1.65;

    ul,
    ol {
      padding-left: 1.25rem;
      margin: 1.25rem 0;
    }

    blockquote {
      padding-left: 1rem;
      margin: 1.25rem 0;
    }

    h2 {
      font-size: 1.375em;
      margin-top: 1.75em;
    }
    h3 {
      font-size: 1.25em;
      margin-top: 1.5em;
    }
    h4 {
      font-size: 1.125em;
    }
  }

  /* iPhone 12 and similar devices */
  @media (max-width: 390px) {
    font-size: 0.95rem;
    line-height: 1.6;
    max-width: 100%;
    width: 100%;

    ul,
    ol {
      padding-left: 1rem;
      margin: 1rem 0;
    }

    blockquote {
      padding-left: 0.75rem;
      margin: 1rem 0;
      font-size: 0.9rem;
    }

    h2 {
      font-size: 1.25em;
      margin-top: 1.5em;
    }
    h3 {
      font-size: 1.125em;
      margin-top: 1.25em;
    }
    h4 {
      font-size: 1.0625em;
    }
  }
`;

const BackButtonContainer = styled.div`
  display: flex;
  align-items: center;
  position: fixed;
  bottom: 2rem;
  left: 2rem;
  z-index: 1000;
  gap: 0.5rem;

  @media (max-width: 768px) {
    bottom: 1.5rem;
    left: 1.5rem;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    bottom: 1rem;
    left: 1rem;
    gap: 0.5rem;
    flex-direction: column;
    align-items: flex-start;
  }
`;

const EditButton = styled.button`
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-size: 0.875rem;
  background: var(--color-btn-bg);
  color: ${lightgrey};
  border: 1px solid var(--color-btn-border);
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  backdrop-filter: blur(10px);

  &:hover {
    background: var(--color-btn-bg-hover);
    border-color: ${accent};
    color: ${accent};
    transform: translateX(-2px);
  }

  &:active {
    transform: translateX(0);
  }

  svg {
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    padding: 0.45rem 0.875rem;
    font-size: 0.8rem;
    gap: 0.3rem;

    svg {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
    gap: 0.25rem;

    svg {
      font-size: 0.75rem;
    }
  }
`;

const DeleteButton = styled.button`
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-size: 0.875rem;
  background: var(--color-btn-bg);
  color: ${lightgrey};
  border: 1px solid var(--color-btn-border);
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: #ff4444;
    color: #ff4444;
    transform: translateX(-2px);
  }

  &:active {
    transform: translateX(0);
  }

  svg {
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    padding: 0.45rem 0.875rem;
    font-size: 0.8rem;
    gap: 0.3rem;

    svg {
      font-size: 0.8rem;
    }
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.75rem;
    font-size: 0.75rem;
    gap: 0.25rem;

    svg {
      font-size: 0.75rem;
    }
  }
`;

const EditForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 800px;
  width: 100%;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: ${accent};
  font-weight: 600;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border-secondary);
  border-radius: 6px;
  color: ${lightgrey};
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${accent};
    background: var(--color-input-bg-focus);
  }

  &::placeholder {
    color: ${lightgrey};
    opacity: 0.4;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border-secondary);
  border-radius: 6px;
  color: ${lightgrey};
  font-size: 1rem;
  min-height: 300px;
  resize: vertical;
  transition: all 0.2s ease;
  font-family: inherit;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: ${accent};
    background: var(--color-input-bg-focus);
  }

  &::placeholder {
    color: ${lightgrey};
    opacity: 0.4;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const SaveButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: ${accent};
  color: ${backgroundColor};
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: ${lightgrey};
  border: 1px solid var(--color-input-border-secondary);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-input-bg);
    border-color: ${accent};
    color: ${accent};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
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
  z-index: 1000;
`;

const DeleteConfirmDialog = styled.div`
  background: ${backgroundColor};
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--color-input-border-secondary);
  max-width: 400px;
  width: 90%;
  text-align: center;
`;

const DeleteConfirmTitle = styled.h3`
  color: #ff4444;
  margin-bottom: 1rem;
  font-size: 1.25rem;
`;

const DeleteConfirmMessage = styled.p`
  color: ${lightgrey};
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const DeleteConfirmActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
`;

const ConfirmDeleteButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #ff3333;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const CommentsCollapse = styled.div<{ $expanded: boolean }>`
  width: 100%;
  display: ${({ $expanded }) => ($expanded ? 'block' : 'none')};
`;

const CommentsToggleButton = styled.button`
  width: 100%;
  padding: 1rem 1.5rem;
  margin: 2rem 0;
  background: var(--color-comment-bg);
  border: 1px solid var(--color-comment-border);
  border-radius: 8px;
  color: color-mix(in srgb, ${accent} 65%, black);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: var(--color-comment-bg-hover);
    border-color: ${accent};
    box-shadow: 0 0 12px rgba(0, 255, 255, 0.2);
  }

  svg {
    font-size: 1.5rem;
  }

  @media (max-width: 768px) {
    font-size: 0.9rem;
    padding: 0.875rem 1.25rem;

    svg {
      font-size: 1.25rem;
    }
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    padding: 0.75rem 1rem;

    svg {
      font-size: 1.15rem;
    }
  }
`;

interface PostDetailProps {
  allPosts: Post[];
  handleClose: () => void;
  onPostsChange?: () => Promise<void>;
  onCommentCountChange?: (postId: number, count: number) => void;
}

const PostDetailComponent = function PostDetail({
  allPosts,
  handleClose,
  onPostsChange,
  onCommentCountChange,
}: PostDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const { trackPostView } = usePostsData();
  const { user, loginWithGoogle } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    body: "",
    slug: "",
    date: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState<
    number | undefined
  >(undefined);
  const post = React.useMemo(() => {
    return allPosts.find((p) => p.slug === slug);
  }, [allPosts, slug]);
  const hasTrackedRef = useRef<string | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const scrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toggle scrollbar visibility imperatively via a class on the Article so
  // scroll/touch/wheel events don't trigger React re-renders of PostDetail.
  const showScrollbarTemporarily = React.useCallback(() => {
    const el = articleRef.current;
    if (!el) return;
    el.classList.add('scrollbar-visible');
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current);
    }
    scrollbarTimeoutRef.current = setTimeout(() => {
      articleRef.current?.classList.remove('scrollbar-visible');
      scrollbarTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Reset local comment count when post changes
  React.useEffect(() => {
    setLocalCommentCount(undefined);
    articleRef.current?.classList.remove('scrollbar-visible');
  }, [post?.id]);

  useEffect(() => {
    return () => {
      if (scrollbarTimeoutRef.current) {
        clearTimeout(scrollbarTimeoutRef.current);
      }
    };
  }, []);

  // Track post view when component mounts - optimize to prevent unnecessary rerenders
  useEffect(() => {
    if (slug && post && hasTrackedRef.current !== slug) {
      hasTrackedRef.current = slug;
      // Use requestAnimationFrame for better timing
      const frame = requestAnimationFrame(() => {
        trackPostView(slug);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [slug, trackPostView, post]);

  // Reset tracking ref when slug changes (new post navigation)
  useEffect(() => {
    return () => {
      hasTrackedRef.current = null;
    };
  }, [slug]);

  React.useLayoutEffect(() => {
    document.documentElement.classList.add('detail-page');
    return () => document.documentElement.classList.remove('detail-page');
  }, []);

  // Scroll-reveal markdown blocks as they enter the Article viewport
  useEffect(() => {
    const root = articleRef.current;
    if (!root || !post) return;

    const target = root.querySelector('.markdown-body');
    if (!target) return;

    const elements = Array.from(target.children) as HTMLElement[];
    if (elements.length === 0) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    elements.forEach((el) => {
      el.dataset.reveal = '';
      if (reduced) el.dataset.revealed = '';
    });

    if (reduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = '';
            observer.unobserve(entry.target);
          }
        }
      },
      { root, threshold: 0.08, rootMargin: '0px 0px -60px 0px' },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [post]);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        showScrollbarTemporarily();
        el.scrollBy({ top: 120, behavior: 'smooth' });
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        showScrollbarTemporarily();
        el.scrollBy({ top: -120, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showScrollbarTemporarily]);

  if (!post) {
    if (allPosts.length === 0) {
      return null;
    }

    return <Navigate to="/posts" replace />;
  }

  // No need to sanitize markdown - react-markdown handles it safely
  const markdownContent = post.body;

  // Edit functionality
  const handleEdit = React.useCallback(() => {
    setEditForm({
      title: post.title,
      body: post.body,
      slug: post.slug,
      date: post.date ? new Date(post.date).toISOString().split("T")[0] : "",
    });
    setIsEditing(true);
  }, [post]);

  const handleCancelEdit = React.useCallback(() => {
    setIsEditing(false);
    setEditForm({ title: "", body: "", slug: "", date: "" });
  }, []);

  const handleSave = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!post.id) return;

      setIsSaving(true);
      try {
        const updateData = {
          title: editForm.title,
          body: editForm.body,
          slug: editForm.slug,
          date: editForm.date ? new Date(editForm.date) : undefined,
        };

        await apiService.updatePost(post.id.toString(), updateData);
        setIsEditing(false);
        // Refresh posts data immediately
        await onPostsChange?.();
      } catch (error) {
        console.error("Failed to update post:", error);
        alert("Failed to update post. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [editForm, post.id, onPostsChange],
  );

  const handleFormChange = React.useCallback((field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Delete functionality
  const handleDelete = React.useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = React.useCallback(async () => {
    if (!post.id) return;

    setIsDeleting(true);
    try {
      await apiService.deletePost(post.id.toString());
      setShowDeleteConfirm(false);
      // Refresh posts data immediately
      await onPostsChange?.();
      // Navigate back to posts page
      handleClose();
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }, [post.id, handleClose, onPostsChange]);

  const handleDeleteCancel = React.useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Toggle comments expanded state
  const toggleComments = React.useCallback(() => {
    setCommentsExpanded((prev) => !prev);
  }, []);

  // Called when comments finish loading — sync count into local state and parent allPosts
  const handleCommentsLoad = React.useCallback((total: number) => {
    setLocalCommentCount(total);
    if (post?.id !== undefined && total !== post.commentCount) {
      onCommentCountChange?.(post.id, total);
    }
  }, [post?.id, post?.commentCount, onCommentCountChange]);

  // Get the display comment count (local override or original)
  const displayCommentCount = localCommentCount ?? post?.commentCount ?? 0;

  return (
    <>
      <PostBackdrop />
      <Article
        ref={articleRef}
        onScroll={showScrollbarTemporarily}
        onTouchMove={showScrollbarTemporarily}
        onWheel={showScrollbarTemporarily}
      >
        {isEditing ? (
          <EditForm onSubmit={handleSave}>
            <FormGroup>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                type="text"
                value={editForm.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Enter post title"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                type="text"
                value={editForm.slug}
                onChange={(e) => handleFormChange("slug", e.target.value)}
                placeholder="Enter post slug"
                required
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={editForm.date}
                onChange={(e) => handleFormChange("date", e.target.value)}
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="body">Body</Label>
              <TextArea
                id="body"
                value={editForm.body}
                onChange={(e) => handleFormChange("body", e.target.value)}
                placeholder="Enter post content (HTML supported)"
                required
              />
            </FormGroup>

            <FormActions>
              <CancelButton type="button" onClick={handleCancelEdit}>
                Cancel
              </CancelButton>
              <SaveButton type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </SaveButton>
            </FormActions>
          </EditForm>
        ) : (
          <>
            <PostFrame>
              <Content>
                <MarkdownContent content={markdownContent} />
              </Content>
            </PostFrame>

            {/* Comments toggle button */}
            <CommentsToggleButton onClick={toggleComments}>
              {commentsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              <span>
                {commentsExpanded ? "Hide" : "Show"} Comments (
                {displayCommentCount})
              </span>
            </CommentsToggleButton>

            {/* Mount comments once on post load so styles inject + fetch
                happen during the initial render. Toggle is then just a
                visibility change, avoiding the first-open repaint. */}
            <CommentsCollapse $expanded={commentsExpanded}>
              <CommentSection
                postId={post.id || 0}
                isAuthenticated={!!user}
                user={user}
                onLogin={loginWithGoogle}
                onCommentsLoad={handleCommentsLoad}
              />
            </CommentsCollapse>
          </>
        )}

        {isAdmin(user) && !isEditing && (
          <BackButtonContainer>
            <EditButton onClick={handleEdit}>
              <EditIcon />
              Edit
            </EditButton>
            <DeleteButton onClick={handleDelete}>
              <DeleteIcon />
              Delete
            </DeleteButton>
          </BackButtonContainer>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <DeleteConfirmOverlay>
            <DeleteConfirmDialog>
              <DeleteConfirmTitle>Delete Post</DeleteConfirmTitle>
              <DeleteConfirmMessage>
                Are you sure you want to delete &quot;{post.title}&quot;? This
                action cannot be undone and will permanently remove the post,
                all comments, and related data.
              </DeleteConfirmMessage>
              <DeleteConfirmActions>
                <CancelButton onClick={handleDeleteCancel}>Cancel</CancelButton>
                <ConfirmDeleteButton
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </ConfirmDeleteButton>
              </DeleteConfirmActions>
            </DeleteConfirmDialog>
          </DeleteConfirmOverlay>
        )}
      </Article>
    </>
  );
};

// Custom comparison function to prevent unnecessary rerenders
const PostDetail = React.memo(PostDetailComponent);

export default PostDetail;
