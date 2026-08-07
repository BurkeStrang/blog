import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Navigate } from "react-router";
import type { Post } from "../model";
import { usePostsData } from "../../../shared/contexts/SearchContext";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { CommentSection } from "../../comments";
import { deletePost, updatePost } from "../api";
import { isAdmin } from "../../../shared/types/user";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { MarkdownContent } from "./MarkdownContent";
import "./post-detail.css";

const SLUG_WORD_REPLACEMENTS: Record<string, string> = {
  api: "API",
  css: "CSS",
  db: "DB",
  go: "Go",
  html: "HTML",
  ii: "II",
  iii: "III",
  iv: "IV",
  javascript: "JavaScript",
  jwt: "JWT",
  oauth: "OAuth",
  react: "React",
  sql: "SQL",
  typescript: "TypeScript",
  ui: "UI",
  url: "URL",
  ux: "UX",
  vite: "Vite",
};

const titleCaseSlugToken = (token: string): string => {
  const normalized = token.toLowerCase();
  const replacement = SLUG_WORD_REPLACEMENTS[normalized];
  if (replacement) {
    return replacement;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatSlugLabel = (slug: string): string => {
  return slug
    .split("-")
    .filter(Boolean)
    .map(titleCaseSlugToken)
    .join(" ");
};

const getSeriesNavLabel = (targetSlug: string, allPosts: Post[]): string => {
  const linkedPost = allPosts.find((candidate) => candidate.slug === targetSlug);
  return linkedPost?.title?.trim() || formatSlugLabel(targetSlug);
};

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
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { trackPostView } = usePostsData();
  const { user, loginWithGoogle } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    body: "",
    slug: "",
    previous: "",
    next: "",
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
  const scrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Toggle scrollbar visibility imperatively via a class on the Article so
  // scroll/touch/wheel events don't trigger React re-renders of PostDetail.
  const showScrollbarTemporarily = React.useCallback(() => {
    const el = articleRef.current;
    if (!el) return;
    el.classList.add("scrollbar-visible");
    if (scrollbarTimeoutRef.current) {
      clearTimeout(scrollbarTimeoutRef.current);
    }
    scrollbarTimeoutRef.current = setTimeout(() => {
      articleRef.current?.classList.remove("scrollbar-visible");
      scrollbarTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Reset local comment count when post changes
  React.useEffect(() => {
    setLocalCommentCount(undefined);
    articleRef.current?.classList.remove("scrollbar-visible");
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

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  React.useLayoutEffect(() => {
    document.documentElement.classList.add("detail-page");
    return () => document.documentElement.classList.remove("detail-page");
  }, []);

  // Stamp `data-reveal` before the first paint so the browser commits
  // the initial opacity:0 state to a frame. Done in useLayoutEffect so
  // the markup paints invisible *before* the observer (below) is even
  // attached — otherwise both `data-reveal` and `data-revealed` can
  // land in the same paint and the CSS transition never triggers.
  React.useLayoutEffect(() => {
    const root = articleRef.current;
    if (!root || !post) return;

    const target = root.querySelector(".markdown-body");
    if (!target) return;

    const elements = Array.from(target.children) as HTMLElement[];
    if (elements.length === 0) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    elements.forEach((el) => {
      el.dataset.reveal = "";
      if (reduced) el.dataset.revealed = "";
    });
  }, [post]);

  // Scroll-reveal markdown blocks as they enter the Article viewport.
  // Runs post-paint so the initial opacity:0 frame is committed first.
  useEffect(() => {
    const root = articleRef.current;
    if (!root || !post) return;

    const target = root.querySelector(".markdown-body");
    if (!target) return;

    const elements = Array.from(target.children) as HTMLElement[];
    if (elements.length === 0) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "";
            observer.unobserve(entry.target);
          }
        }
      },
      { root, threshold: 0.08, rootMargin: "0px 0px -60px 0px" },
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [post]);

  useEffect(() => {
    const el = articleRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        showScrollbarTemporarily();
        el.scrollBy({ top: 120, behavior: "smooth" });
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        showScrollbarTemporarily();
        el.scrollBy({ top: -120, behavior: "smooth" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      previous: post.previous ?? "",
      next: post.next ?? "",
      date: post.date ? new Date(post.date).toISOString().split("T")[0] : "",
    });
    setIsEditing(true);
  }, [post]);

  const handleCancelEdit = React.useCallback(() => {
    setIsEditing(false);
    setEditForm({ title: "", body: "", slug: "", previous: "", next: "", date: "" });
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
          previous: editForm.previous || undefined,
          next: editForm.next || undefined,
          date: editForm.date ? new Date(editForm.date) : undefined,
        };

        await updatePost(post.id.toString(), updateData);
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
      await deletePost(post.id.toString());
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
  const handleCommentsLoad = React.useCallback(
    (total: number) => {
      setLocalCommentCount(total);
      if (post?.id !== undefined && total !== post.commentCount) {
        onCommentCountChange?.(post.id, total);
      }
    },
    [post?.id, post?.commentCount, onCommentCountChange],
  );

  // Get the display comment count (local override or original)
  const displayCommentCount = localCommentCount ?? post?.commentCount ?? 0;
  const previousSlug = post.previous?.trim();
  const nextSlug = post.next?.trim();
  const previousLabel = previousSlug
    ? getSeriesNavLabel(previousSlug, allPosts)
    : null;
  const nextLabel = nextSlug ? getSeriesNavLabel(nextSlug, allPosts) : null;

  const handleSeriesNavigation = React.useCallback(
    (targetSlug: string) => {
      navigate(`/posts/${targetSlug}`);
    },
    [navigate],
  );

  return (
    <>
      <div className="post-detail__backdrop" />
      <article
        ref={articleRef}
        className="post-detail__article"
        onScroll={showScrollbarTemporarily}
        onTouchMove={showScrollbarTemporarily}
        onWheel={showScrollbarTemporarily}
      >
        {isEditing ? (
          <form className="post-detail__form" onSubmit={handleSave}>
            <div className="post-detail__form-group">
              <label className="post-detail__label" htmlFor="title">Title</label>
              <input
                className="post-detail__input"
                id="title"
                type="text"
                value={editForm.title}
                onChange={(e) => handleFormChange("title", e.target.value)}
                placeholder="Enter post title"
                required
              />
            </div>

            <div className="post-detail__form-group">
              <label className="post-detail__label" htmlFor="slug">Slug</label>
              <input
                className="post-detail__input"
                id="slug"
                type="text"
                value={editForm.slug}
                onChange={(e) => handleFormChange("slug", e.target.value)}
                placeholder="Enter post slug"
                required
              />
            </div>

            <div className="post-detail__form-group">
              <label className="post-detail__label" htmlFor="date">Date</label>
              <input
                className="post-detail__input"
                id="date"
                type="date"
                value={editForm.date}
                onChange={(e) => handleFormChange("date", e.target.value)}
              />
            </div>

            <div className="post-detail__form-group">
              <label className="post-detail__label" htmlFor="previous">Previous Post Slug</label>
              <input
                className="post-detail__input"
                id="previous"
                type="text"
                value={editForm.previous}
                onChange={(e) => handleFormChange("previous", e.target.value)}
                placeholder="optional-previous-post-slug"
              />
            </div>

            <div className="post-detail__form-group">
              <label className="post-detail__label" htmlFor="next">Next Post Slug</label>
              <input
                className="post-detail__input"
                id="next"
                type="text"
                value={editForm.next}
                onChange={(e) => handleFormChange("next", e.target.value)}
                placeholder="optional-next-post-slug"
              />
            </div>

            <div className="post-detail__form-group">
              <label className="post-detail__label" htmlFor="body">Body</label>
              <textarea
                className="post-detail__textarea"
                id="body"
                value={editForm.body}
                onChange={(e) => handleFormChange("body", e.target.value)}
                placeholder="Enter post content (HTML supported)"
                required
              />
            </div>

            <div className="post-detail__form-actions">
              <button type="button" className="post-detail__cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button type="submit" className="post-detail__save-btn" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="post-detail__frame" key={post.slug}>
              <div className="post-detail__content">
                <MarkdownContent content={markdownContent} />
              </div>
            </div>

            {/* Comments toggle button */}
            <button className="post-detail__comments-toggle" onClick={toggleComments}>
              {commentsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              <span>
                {commentsExpanded ? "Hide" : "Show"} Comments (
                {displayCommentCount})
              </span>
            </button>

            {/* Mount comments once on post load so styles inject + fetch
                happen during the initial render. Toggle is then just a
                visibility change, avoiding the first-open repaint. */}
            <div className="post-detail__comments-collapse" data-expanded={commentsExpanded}>
              <CommentSection
                postId={post.id || 0}
                isAuthenticated={!!user}
                user={user}
                onLogin={loginWithGoogle}
                onCommentsLoad={handleCommentsLoad}
              />
            </div>

            {(previousSlug || nextSlug) && (
              <nav className="post-detail__series-nav" aria-label="Post navigation">
                {previousSlug ? (
                  <button
                    type="button"
                    className="post-detail__series-nav-btn"
                    data-align="left"
                    onClick={() => handleSeriesNavigation(previousSlug)}
                    title={previousLabel ?? previousSlug}
                  >
                    <ArrowBackIcon />
                    <span className="post-detail__series-nav-text">
                      <span className="post-detail__series-nav-label">Previous</span>
                      <span className="post-detail__series-nav-slug">{previousLabel}</span>
                    </span>
                  </button>
                ) : (
                  <div className="post-detail__series-nav-spacer" aria-hidden="true" />
                )}

                {nextSlug ? (
                  <button
                    type="button"
                    className="post-detail__series-nav-btn"
                    data-align="right"
                    onClick={() => handleSeriesNavigation(nextSlug)}
                    title={nextLabel ?? nextSlug}
                  >
                    <span className="post-detail__series-nav-text">
                      <span className="post-detail__series-nav-label">Next</span>
                      <span className="post-detail__series-nav-slug">{nextLabel}</span>
                    </span>
                    <ArrowForwardIcon />
                  </button>
                ) : (
                  <div className="post-detail__series-nav-spacer" aria-hidden="true" />
                )}
              </nav>
            )}
          </>
        )}

        {isAdmin(user) && !isEditing && (
          <div className="post-detail__admin-actions">
            <button className="post-detail__edit-btn" onClick={handleEdit}>
              <EditIcon />
              Edit
            </button>
            <button className="post-detail__delete-btn" onClick={handleDelete}>
              <DeleteIcon />
              Delete
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="post-detail__confirm-overlay">
            <div className="post-detail__confirm-dialog">
              <h3 className="post-detail__confirm-title">Delete Post</h3>
              <p className="post-detail__confirm-message">
                Are you sure you want to delete &quot;{post.title}&quot;? This
                action cannot be undone and will permanently remove the post,
                all comments, and related data.
              </p>
              <div className="post-detail__confirm-actions">
                <button className="post-detail__cancel-btn" onClick={handleDeleteCancel}>Cancel</button>
                <button
                  className="post-detail__confirm-delete-btn"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </article>
    </>
  );
};

// Custom comparison function to prevent unnecessary rerenders
const PostDetail = React.memo(PostDetailComponent);

export default PostDetail;
