import React, { useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { SideBar } from "../features/layout";
import { Posts, PostDetail, NewPost } from "../features/posts";
import { About, NotFound } from "../features/pages";
import { CanvasBackground, GlobalStyle } from "../shared/theme/GlobalStyles";
import { LazyOceanCanvas } from "../features/ocean";
import styled from "styled-components";
import { LoadingCubes } from "../shared/components";
import { Vector3 } from "three";
import { backgroundColor } from "../shared/theme/colors";
import { useAssetLoader, usePostsApi } from "../shared/hooks";
import { memoryTracker } from "../engine/memory/MemoryTracker";
import { User } from "../shared/types/user";
import { memoryMonitor } from "../engine/memory/MemoryProfiler";
import { cleanupResourcePoolIntervals } from "../engine/memory/ResourcePool";
import { usePostsData } from "../shared/contexts/SearchContext";
import { ThemeProvider } from "../shared/contexts/ThemeContext";
import { apiService } from "../services/api";
import { cacheInvalidation } from "../services/cache/CacheManager";

export interface Post {
  id?: number;
  slug: string;
  title: string;
  body: string;
  position?: Vector3;
  date?: Date;
  pageViews?: number;
  recentViews?: number; // Views in the last 7 days
  lastViewed?: Date; // Last time this post was viewed
  commentCount?: number; // Comment count for trending calculation
}

const LoaderOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${backgroundColor};
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Container for the canvas to toggle visibility
const PersistentCanvasWrapper = styled.div<{ hidden: boolean }>`
  position: absolute;
  inset: 0;
  pointer-events: ${({ hidden }) => (hidden ? "none" : "auto")};
  opacity: ${({ hidden }) => (hidden ? 0 : 1)};
  /* Removed transition for instant hiding */
`;

const AppContent: React.FC = memo(() => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch posts from API
  const { posts, loading: postsLoading, error: postsError, refetch: refetchPosts } = usePostsApi();

  // Use search context
  const { allPosts: searchPosts, filteredPosts, setAllPosts, updatePost, isSorting } = usePostsData();

  // Immediate uncached refresh function
  const refreshPostsImmediate = useCallback(async () => {
    try {
      // Invalidate all post-related caches first
      cacheInvalidation.invalidatePostCaches();
      
      // Get fresh posts without any caching
      const freshPosts = await apiService.getPostsUncached();
      
      // Update search context immediately
      setAllPosts(freshPosts);
      
      // Also trigger the regular refetch to update the main posts state
      refetchPosts();
    } catch (error) {
      console.error('Failed to refresh posts immediately:', error);
      // Fallback to regular refetch
      refetchPosts();
    }
  }, [setAllPosts, refetchPosts]);

  const updatePostCommentCount = useCallback((postId: number, count: number) => {
    updatePost(postId, { commentCount: count });
  }, [updatePost]);

  // Create a Set of visible post slugs for efficient lookup - memoized more efficiently
  const visiblePostSlugs = useMemo(() => {
    return new Set(filteredPosts.map((post) => post.slug));
  }, [filteredPosts]);

  const [shouldLoadCanvas, setShouldLoadCanvas] = useState(false);

  // Preload all assets once
  const { isLoading, error, resources } = useAssetLoader();
  const [canvasLoaded, setCanvasLoaded] = useState(false);

  // Memoize resource loading state to prevent unnecessary re-renders
  const resourceState = useMemo(() => {
    const loadingState = isLoading || postsLoading;
    const postsLoadedState = !postsLoading;
    const resourcesReadyState = !loadingState && posts.length > 0;

    return {
      isLoading: loadingState,
      postsLoaded: postsLoadedState,
      resourcesReady: resourcesReadyState,
      postsError,
    };
  }, [isLoading, postsLoading, posts.length, postsError]);

  // Canvas is fully ready when 3D scene has finished rendering
  const canvasReady =
    resourceState.resourcesReady && canvasLoaded && shouldLoadCanvas;

  // Only load canvas for posts list, home route, and about page (not for direct post detail navigation)
  useEffect(() => {
    const isPostsRoute = location.pathname === "/posts";
    const isHomeRoute = location.pathname === "/";
    const isAboutRoute = location.pathname === "/about";

    // Load canvas for posts list, home, and about routes
    // Do NOT load for direct post detail navigation (/posts/:slug)
    if (isHomeRoute || isPostsRoute || isAboutRoute) {
      setShouldLoadCanvas(true);
    }
  }, [location.pathname]);

  // Memory tracking (async to avoid blocking)
  useEffect(() => {
    if (canvasReady) {
      // Use setTimeout to make memory tracking non-blocking
      setTimeout(() => {
        memoryTracker.takeSnapshot("AppContent-Ready");
      }, 0);
    }
  }, [canvasReady]);

  // Cleanup all memory-related intervals and resources on unmount
  useEffect(() => {
    // Listen for forced cleanup events
    const handleForceCleanup = (event: CustomEvent) => {
      
      // Force cleanup of any large objects or caches
      if (resources) {
        // Clear any cached resources that can be reloaded
        Object.values(resources).forEach((resource) => {
          if (resource && typeof resource.dispose === "function") {
            try {
              resource.dispose();
            } catch (error) {
              console.warn(
                "Error disposing resource during force cleanup:",
                error,
              );
            }
          }
        });
      }

      // Force cleanup of geometry manager pools
      if (typeof window !== 'undefined') {
        const windowWithGeometryManager = window as Window & { 
          geometryManager?: { dispose: () => void } 
        };
        if (windowWithGeometryManager.geometryManager) {
          windowWithGeometryManager.geometryManager.dispose();
        }
      }

      // Clear text geometry cache in PostCube
      if (typeof window !== 'undefined') {
        const windowWithTextCache = window as Window & { 
          textGeometryCache?: Map<string, import('three/examples/jsm/geometries/TextGeometry').TextGeometry> 
        };
        if (windowWithTextCache.textGeometryCache) {
          windowWithTextCache.textGeometryCache.clear();
        }
      }

      // Dispatch cleanup event for all components
      window.dispatchEvent(new CustomEvent('geometry-cleanup-force', {
        detail: { severity: event.detail.severity }
      }));

      if (event.detail.severity === "high") {
        // no-op: high-severity memory pressure logged above
      }
    };

    const handleEmergencyCleanup = () => {};

    window.addEventListener(
      "memory-cleanup-force",
      handleForceCleanup as EventListener,
    );
    window.addEventListener(
      "memory-cleanup-emergency",
      handleEmergencyCleanup as EventListener,
    );

    return () => {
      window.removeEventListener(
        "memory-cleanup-force",
        handleForceCleanup as EventListener,
      );
      window.removeEventListener(
        "memory-cleanup-emergency",
        handleEmergencyCleanup as EventListener,
      );

      // Cleanup all development intervals and memory monitoring
      memoryMonitor.dispose();
      cleanupResourcePoolIntervals();
      // Force a final memory snapshot
      setTimeout(() => {
        memoryTracker.takeSnapshot("AppContent-Cleanup");
      }, 100);
    };
  }, [resources]);

  const lastClickedSlugRef = useRef<string | null>(null);
  const handlePostClick = useCallback(
    (slug: string) => {
      if (lastClickedSlugRef.current === slug) return;
      lastClickedSlugRef.current = slug;
      navigate(`/posts/${slug}`);
      setTimeout(() => { lastClickedSlugRef.current = null; }, 1000);
    },
    [navigate],
  );

  const handleCanvasLoaded = useCallback(() => {
    setCanvasLoaded(true);
  }, []);

  // Memoize stable props to prevent LazyOceanCanvas re-renders
  const oceanCanvasProps = useMemo(
    () => ({
      posts,
      resources,
      visiblePostSlugs,
      sortedPosts: filteredPosts,
      isSorting,
      onPostClick: handlePostClick,
      onLoaded: handleCanvasLoaded,
      loadTrigger: "viewport" as const,
    }),
    [posts, resources, visiblePostSlugs, filteredPosts, isSorting, handlePostClick, handleCanvasLoaded],
  );

  const handleClose = useCallback(() => {
    navigate("/posts");
  }, [navigate]);

  // Authentication handlers
  const handleLogin = useCallback(
    (userData: User, token: string) => {
      setUser(userData);
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(userData));
      // Only navigate if we're not already where we want to be
      const returnTo = localStorage.getItem("returnTo");
      if (returnTo && returnTo !== location.pathname) {
        localStorage.removeItem("returnTo");
        navigate(returnTo);
      } else if (!returnTo && location.pathname === "/") {
        navigate("/posts");
      } else {
        localStorage.removeItem("returnTo");
      }
    },
    [navigate, location.pathname],
  );

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    // Stay on current page after logout - no redirect needed
  }, []);

  // Memoize sidebar props to prevent unnecessary re-renders
  const sidebarProps = useMemo(
    () => ({
      onPostsClick: () => navigate("/posts"),
      user,
      onLogout: handleLogout,
      onLogin: handleLogin,
    }),
    [user, handleLogout, handleLogin, navigate],
  );

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
    }
  }, []);

  // Periodic token validation check
  useEffect(() => {
    const checkTokenPeriodically = () => {
      const token = localStorage.getItem("authToken");
      if (!token || !user) return;

      try {
        // JWT tokens have 3 parts separated by dots
        const parts = token.split('.');
        if (parts.length !== 3) {
          handleLogout();
          return;
        }
        
        // Decode the payload (second part)
        const payload = JSON.parse(atob(parts[1]));
        
        // Check if token has exp claim and if it's expired
        if (payload.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - currentTime;
          
          // If token expires in less than 5 minutes, show warning
          if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
            console.warn('Token expires soon, user should re-authenticate');
          }
          
          // If token is expired, sign out automatically
          if (timeUntilExpiry <= 0) {
            window.dispatchEvent(new CustomEvent('auth-error', {
              detail: { 
                message: 'Your session has expired. Please sign in again.',
                reason: 'token_expired'
              }
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to parse JWT token during periodic check:', error);
        handleLogout();
      }
    };

    // Check every 60 seconds
    const interval = setInterval(checkTokenPeriodically, 60000);
    
    // Also check immediately
    checkTokenPeriodically();

    return () => clearInterval(interval);
  }, [user, handleLogout]);

  // Listen for OAuth success events to update user state without page reload
  useEffect(() => {
    const handleOAuthSuccess = (event: CustomEvent) => {
      setUser(event.detail.user);
    };

    window.addEventListener(
      "oauth-success",
      handleOAuthSuccess as EventListener,
    );

    return () => {
      window.removeEventListener(
        "oauth-success",
        handleOAuthSuccess as EventListener,
      );
    };
  }, []);

  // Listen for authentication errors to automatically sign out user
  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      // Clear user state
      setUser(null);
      
      // Show user feedback
      const message = event.detail.message || 'Your session has expired. Please sign in again.';
      
      // Create a temporary notification element
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(40, 40, 40, 0.95);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        max-width: 200px;
        animation: slideIn 0.3s ease-out;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `;

      // Add animation keyframes
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 0.6; }
        }
        @keyframes slideOut {
          from { transform: translateY(0); opacity: 0.6; }
          to { transform: translateY(-20px); opacity: 0; }
        }

        @media (max-width: 768px) {
          div[style*="session-notification"] {
            top: 8px !important;
            right: 8px !important;
            font-size: 11px !important;
            padding: 0.4rem 0.6rem !important;
            max-width: 160px !important;
          }
        }
      `;
      document.head.appendChild(style);

      notification.textContent = message;
      notification.setAttribute('data-notification', 'session-notification');
      document.body.appendChild(notification);

      // Remove notification after 2 seconds (shorter duration)
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          document.body.removeChild(notification);
          document.head.removeChild(style);
        }, 300);
      }, 3000);
    };

    window.addEventListener(
      "auth-error",
      handleAuthError as EventListener,
    );

    return () => {
      window.removeEventListener(
        "auth-error",
        handleAuthError as EventListener,
      );
    };
  }, []);


  // Update search context when posts are loaded from API - prevent multiple calls
  const prevPostsSignatureRef = useRef("");

  useEffect(() => {
    if (posts.length > 0) {
      const signature = posts
        .map((post) => `${post.id ?? post.slug}:${post.slug}:${post.title}:${post.date ?? ""}:${post.pageViews ?? 0}:${post.commentCount ?? 0}`)
        .join("|");
      if (signature === prevPostsSignatureRef.current) return;

      prevPostsSignatureRef.current = signature;
      setAllPosts(posts);
    }
  }, [posts, setAllPosts]);

  const isOAuthCallback = location.pathname === "/auth/callback";
  const isAboutPage = location.pathname === "/about";
  const isNewPost = location.pathname === "/posts/new";

  // Derive detail state directly from URL — no selectedPost state needed
  const isDetail = /^\/posts\/[^/]+$/.test(location.pathname) && !isNewPost;

  // Detect posts page to control overflow
  const isPostsPage = location.pathname === "/posts";

  // Manage posts-page class on html element
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isPostsPage) {
      htmlElement.classList.add('posts-page');
    } else {
      htmlElement.classList.remove('posts-page');
    }
    
    // Cleanup function to remove class when component unmounts
    return () => {
      htmlElement.classList.remove('posts-page');
    };
  }, [isPostsPage]);

  // Show UI immediately for direct post navigation, with loading state for canvas routes
  const showUI =
    resourceState.resourcesReady && (shouldLoadCanvas ? canvasLoaded : true);

  return (
    <ThemeProvider userEmail={user?.email}>
      <GlobalStyle />
      {resourceState.resourcesReady && shouldLoadCanvas && (
        <PersistentCanvasWrapper
          hidden={isOAuthCallback || (isDetail && !isAboutPage) || isNewPost}
        >
          <CanvasBackground>
            <LazyOceanCanvas
              {...oceanCanvasProps}
              isPaused={(isDetail && !isAboutPage) || isOAuthCallback || isNewPost}
            />
          </CanvasBackground>
        </PersistentCanvasWrapper>
      )}

{!showUI && (
        <LoaderOverlay>
          {error || postsError ? (
            <div style={{ color: "#ff4444", textAlign: "center" }}>
              <div>Loading failed: {error || postsError}</div>
              <div style={{ marginTop: "10px", fontSize: "0.8em" }}>
                {postsError
                  ? "Check if the Go API is running and accessible"
                  : "Refresh to try again"}
              </div>
            </div>
          ) : (
            <LoadingCubes size={120} />
          )}
        </LoaderOverlay>
      )}

      {showUI && (
        <>
          {!isDetail && <SideBar {...sidebarProps} />}
          <Routes>
            <Route path="/about" element={<About />} />
            <Route
              path="/posts"
              element={<Posts user={user} />}
            />
            <Route
              path="/posts/new"
              element={<NewPost user={user} onPostsChange={refreshPostsImmediate} />}
            />
            <Route
              path="/posts/:slug"
              element={
                <PostDetail
                  allPosts={searchPosts}
                  handleClose={handleClose}
                  user={user}
                  onLogin={handleLogin}
                  onPostsChange={refreshPostsImmediate}
                  onCommentCountChange={updatePostCommentCount}
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </>
      )}
    </ThemeProvider>
  );
});

AppContent.displayName = "AppContent";

export default AppContent;
