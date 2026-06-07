import React, { lazy, Suspense, useEffect, useState, useCallback, useMemo, memo, useRef } from "react";
import { flushSync } from "react-dom";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { SideBar } from "../features/layout";
import { CanvasBackground, GlobalStyle } from "../shared/theme/GlobalStyles";
import styled from "styled-components";
import { LoadingCubes } from "../shared/components";
import { backgroundColor } from "../shared/theme/colors";
import { useAssetLoader } from "../shared/hooks";
import { usePosts, fetchPostsUncached } from "../features/posts";
import { usePostsData } from "../shared/contexts/SearchContext";
import { ThemeProvider } from "../shared/contexts/ThemeContext";
import { cacheInvalidation } from "../shared/services/cache/CacheManager";
import { installMobileHapticsListener } from "../shared/services/haptics";

// LazyOceanCanvas is itself lazy-loaded so its three-vendor / react-three /
// OceanScene dependency graph stays out of the initial bundle. Routes that
// never set shouldLoadCanvas (e.g. /posts/:slug) won't fetch them at all.
const LazyOceanCanvas = lazy(() =>
  import("../features/ocean").then((m) => ({ default: m.LazyOceanCanvas })),
);
const About = lazy(() => import("../features/pages/About"));
const Posts = lazy(() =>
  import("../features/posts").then((m) => ({ default: m.Posts })),
);
const NewPost = lazy(() =>
  import("../features/posts").then((m) => ({ default: m.NewPost })),
);
const PostDetail = lazy(() =>
  import("../features/posts").then((m) => ({ default: m.PostDetail })),
);
const NotFound = lazy(() =>
  import("../features/pages/NotFound").then((module) => ({
    default: module.NotFound,
  })),
);

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
  transition: opacity 140ms ease-out;
`;

const AppContent: React.FC = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch posts from API
  const { posts, loading: postsLoading, error: postsError, refetch: refetchPosts } = usePosts();

  // Use search context
  const { allPosts: searchPosts, filteredPosts, setAllPosts, updatePost, isSorting } = usePostsData();

  // Immediate uncached refresh function
  const refreshPostsImmediate = useCallback(async () => {
    try {
      // Invalidate all post-related caches first
      cacheInvalidation.invalidatePostCaches();
      
      // Get fresh posts without any caching
      const freshPosts = await fetchPostsUncached();
      
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

  // Compute synchronously per render so the asset loader can gate on it
  // without an extra effect roundtrip. Routes that don't mount the canvas
  // (e.g. /posts/:slug) skip 3D asset loading entirely.
  const isCanvasRoute =
    location.pathname === "/" ||
    location.pathname === "/posts" ||
    location.pathname === "/about";
  const [shouldLoadCanvas, setShouldLoadCanvas] = useState(isCanvasRoute);

  // Preload heavy 3D assets only when a canvas route is active. The
  // assetLoaderImpl module (containing three, GLTFLoader, etc.) is
  // dynamic-imported by the hook only when enabled — keeps three-vendor
  // out of the entry dep graph on post-detail routes.
  const { isLoading, error, resources } = useAssetLoader(isCanvasRoute);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [pendingDetailSlug, setPendingDetailSlug] = useState<string | null>(null);
  const [pendingRoutePath, setPendingRoutePath] = useState<string | null>(null);

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
    return installMobileHapticsListener();
  }, []);

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

  // Memory tracking (async to avoid blocking — engine modules dynamically loaded)
  useEffect(() => {
    if (canvasReady) {
      setTimeout(() => {
        void import("../engine/memory/MemoryTracker").then(({ memoryTracker }) => {
          memoryTracker.takeSnapshot("AppContent-Ready");
        });
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

      // Cleanup all development intervals and memory monitoring — modules
      // are dynamically loaded so they don't bloat the initial chunk.
      void Promise.all([
        import("../engine/memory/MemoryProfiler"),
        import("../engine/memory/ResourcePool"),
        import("../engine/memory/MemoryTracker"),
      ]).then(([{ memoryMonitor }, { cleanupResourcePoolIntervals }, { memoryTracker }]) => {
        memoryMonitor.dispose();
        cleanupResourcePoolIntervals();
        setTimeout(() => {
          memoryTracker.takeSnapshot("AppContent-Cleanup");
        }, 100);
      });
    };
  }, [resources]);

  const lastClickedSlugRef = useRef<string | null>(null);
  const handlePostClick = useCallback(
    (slug: string) => {
      if (lastClickedSlugRef.current === slug) return;
      lastClickedSlugRef.current = slug;
      flushSync(() => {
        setPendingDetailSlug(slug);
      });
      navigate(`/posts/${slug}`);
      setTimeout(() => { lastClickedSlugRef.current = null; }, 1000);
    },
    [navigate],
  );

  const handleRouteTransitionStart = useCallback((path: string) => {
    flushSync(() => {
      setPendingRoutePath(path);
    });
  }, []);

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

  const detailPosts = useMemo(
    () => (searchPosts.length > 0 ? searchPosts : posts),
    [searchPosts, posts],
  );

  const handleClose = useCallback(() => {
    navigate("/posts");
  }, [navigate]);

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
  const isOpeningDetail = pendingDetailSlug !== null && !isDetail;
  const hidePostsChrome = isDetail || isOpeningDetail;
  const showSidebar = !isOpeningDetail && !isOAuthCallback && !isNewPost;

  useEffect(() => {
    if (isDetail) {
      setPendingDetailSlug(null);
    }
  }, [isDetail]);

  useEffect(() => {
    if (pendingRoutePath === location.pathname) {
      setPendingRoutePath(null);
    }
  }, [location.pathname, pendingRoutePath]);

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
    resourceState.resourcesReady &&
    (shouldLoadCanvas && !isAboutPage ? canvasLoaded : true);

  return (
    <ThemeProvider>
      <GlobalStyle />
      {resourceState.resourcesReady && shouldLoadCanvas && (
        <PersistentCanvasWrapper
          hidden={isOAuthCallback || (hidePostsChrome && !isAboutPage) || isNewPost}
        >
          <CanvasBackground>
            {/* LazyOceanCanvas is React.lazy so it needs a Suspense boundary.
                Fallback is null because PersistentCanvasWrapper already hides
                the area during load and useAssetLoader gates `resourcesReady`. */}
            <Suspense fallback={null}>
              <LazyOceanCanvas
                {...oceanCanvasProps}
                isPaused={(hidePostsChrome && !isAboutPage) || isOAuthCallback || isNewPost}
              />
            </Suspense>
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
                  ? "API not accessible"
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
          {showSidebar && <SideBar onNavigateStart={handleRouteTransitionStart} />}
          <Suspense
            fallback={
              <LoaderOverlay>
                <LoadingCubes size={120} />
              </LoaderOverlay>
            }
          >
            <Routes>
              <Route path="/about" element={<About />} />
              <Route path="/posts" element={hidePostsChrome ? null : <Posts />} />
              <Route
                path="/posts/new"
                element={<NewPost onPostsChange={refreshPostsImmediate} />}
              />
              <Route
                path="/posts/:slug"
                element={
                  <PostDetail
                    allPosts={detailPosts}
                    handleClose={handleClose}
                    onPostsChange={refreshPostsImmediate}
                    onCommentCountChange={updatePostCommentCount}
                  />
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </>
      )}
    </ThemeProvider>
  );
});

AppContent.displayName = "AppContent";

export default AppContent;
