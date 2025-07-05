import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { SideBar } from "../features/layout";
import { Posts, PostDetail } from "../features/posts";
import { About, NotFound } from "../features/pages";
// Removed Login import - no longer needed
import { CanvasBackground, GlobalStyle } from "../shared/theme/GlobalStyles";
import { LazyOceanCanvas } from "../features/ocean";
import styled from "styled-components";
import { LoadingCubes } from "../shared/components";
import * as THREE from "three";
import { backgroundColor } from "../shared/theme/colors";
import { useAssetLoader, usePostsApi } from "../shared/hooks";
import { memoryTracker } from "../engine/memory/MemoryTracker";
import { User } from "../shared/types/user";
import { memoryMonitor } from "../engine/memory/MemoryProfiler";
import { cleanupResourcePoolIntervals } from "../engine/memory/ResourcePool";
import { useSearch } from "../shared/contexts/SearchContext";

export interface Post {
  slug: string;
  title: string;
  body: string;
  position?: THREE.Vector3;
  date?: Date;
  pageViews?: number;
  recentViews?: number; // Views in the last 7 days
  lastViewed?: Date; // Last time this post was viewed
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
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Fetch posts from API
  const { posts, loading: postsLoading, error: postsError } = usePostsApi();
  
  // Use search context
  const { filteredPosts, setAllPosts, isSorting } = useSearch();
  
  // Create a Set of visible post slugs for efficient lookup - memoized more efficiently
  const visiblePostSlugs = useMemo(() => {
    return new Set(filteredPosts.map(post => post.slug));
  }, [filteredPosts]);

  // Track navigation history to determine if we should load canvas
  const [, setHasVisitedHome] = useState(false);
  const [shouldLoadCanvas, setShouldLoadCanvas] = useState(false);
  
  // Preload all assets once
  const { isLoading, error, resources } = useAssetLoader();
  const [canvasLoaded, setCanvasLoaded] = useState(false);

  // Memoize resource loading state to prevent unnecessary re-renders
  const resourceState = useMemo(() => ({
    isLoading: isLoading || postsLoading,
    postsLoaded: !postsLoading,
    resourcesReady: !isLoading && !postsLoading && posts.length > 0,
    postsError,
  }), [isLoading, postsLoading, posts.length, postsError]);
  
  // Canvas is fully ready when 3D scene has finished rendering
  const canvasReady = resourceState.resourcesReady && canvasLoaded && shouldLoadCanvas;

  // Only load canvas for posts list and home route (not for direct post detail navigation)
  useEffect(() => {
    const isPostsRoute = location.pathname === '/posts';
    const isHomeRoute = location.pathname === '/';
    
    // Load canvas only for posts list and home routes
    // Do NOT load for direct post detail navigation (/posts/:slug)
    if (isHomeRoute || isPostsRoute) {
      setHasVisitedHome(true);
      setShouldLoadCanvas(true);
    }
  }, [location.pathname]);


  // Memory tracking (async to avoid blocking)
  useEffect(() => {
    if (canvasReady) {
      // Use setTimeout to make memory tracking non-blocking
      setTimeout(() => {
        memoryTracker.takeSnapshot('AppContent-Ready');
      }, 0);
    }
  }, [canvasReady]);

  // Cleanup all memory-related intervals and resources on unmount
  useEffect(() => {
    return () => {
      // Cleanup all development intervals and memory monitoring
      memoryMonitor.dispose();
      cleanupResourcePoolIntervals();
      // Force a final memory snapshot
      setTimeout(() => {
        memoryTracker.takeSnapshot('AppContent-Cleanup');
      }, 100);
    };
  }, []);

  const handlePostClick = useCallback(
    (slug: string) => {
      const post = posts.find((p) => p.slug === slug);
      if (post) {
        setSelectedPost(post);
        navigate(`/posts/${slug}`);
      }
    },
    [posts, navigate],
  );

  const handleClose = useCallback(() => {
    setSelectedPost(null);
    // Ensure canvas loads when navigating back to posts from post detail
    setHasVisitedHome(true);
    setShouldLoadCanvas(true);
    navigate("/posts");
  }, [navigate]);

  // Authentication handlers
  const handleLogin = useCallback((userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    // Go back to previous page or default to posts
    const returnTo = localStorage.getItem('returnTo') || '/posts';
    localStorage.removeItem('returnTo');
    navigate(returnTo);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Stay on current page after logout - no redirect needed
  }, []);

  // Check for existing authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Listen for OAuth success events to update user state without page reload
  useEffect(() => {
    const handleOAuthSuccess = (event: CustomEvent) => {
      console.log('OAuth success event received:', event.detail);
      setUser(event.detail.user);
    };

    window.addEventListener('oauth-success', handleOAuthSuccess as EventListener);
    
    return () => {
      window.removeEventListener('oauth-success', handleOAuthSuccess as EventListener);
    };
  }, []);

  // Update search context when posts are loaded from API
  useEffect(() => {
    if (posts.length > 0) {
      setAllPosts(posts);
    }
  }, [posts, setAllPosts]);

  // Simplest possible detail detection for maximum speed
  const isDetail = selectedPost !== null;
  
  // Detect OAuth callback route to hide ocean scene
  const isOAuthCallback = location.pathname === '/auth/callback';
  
  // Show UI immediately for direct post navigation, with loading state for canvas routes
  const showUI = resourceState.resourcesReady && (shouldLoadCanvas ? canvasLoaded : true);

  return (
    <>
      <GlobalStyle />
      {resourceState.resourcesReady && shouldLoadCanvas && (
        <PersistentCanvasWrapper hidden={isDetail || isOAuthCallback}>
          <CanvasBackground>
            <LazyOceanCanvas
              posts={posts}
              onPostClick={handlePostClick}
              resources={resources}
              onLoaded={() => setCanvasLoaded(true)}
              isPaused={isDetail || isOAuthCallback}
              loadTrigger="viewport"
              visiblePostSlugs={visiblePostSlugs}
              sortedPosts={filteredPosts}
              isSorting={isSorting}
            />
          </CanvasBackground>
        </PersistentCanvasWrapper>
      )}

      {!showUI && (
        <LoaderOverlay>
          {error || postsError ? (
            <div style={{ color: '#ff4444', textAlign: 'center' }}>
              <div>Loading failed: {error || postsError}</div>
              <div style={{ marginTop: '10px', fontSize: '0.8em' }}>
                {postsError ? 'Check if the Go API is running and accessible' : 'Refresh to try again'}
              </div>
            </div>
          ) : (
            <LoadingCubes
              size={120}
              color="#0ff"
            />
          )}
        </LoaderOverlay>
      )}

      {showUI && (
        <>
          <SideBar onPostsClick={() => setSelectedPost(null)} user={user} onLogout={handleLogout} onLogin={handleLogin} />
          <Routes>
            <Route path="/about" element={<About />} />
            <Route
              path="/posts"
              element={<Posts selectedPost={selectedPost} />}
            />
            <Route
              path="/posts/:slug"
              element={
                <PostDetail allPosts={posts} handleClose={handleClose} />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </>
      )}
    </>
  );
});

AppContent.displayName = 'AppContent';

export default AppContent;
