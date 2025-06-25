import React, { useEffect, useState, useCallback, useMemo, memo } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { SideBar } from "../features/layout";
import { Posts, PostDetail } from "../features/posts";
import { About, Profile } from "../features/pages";
import { CanvasBackground, GlobalStyle } from "../shared/theme/GlobalStyles";
import { LazyOceanCanvas } from "../features/ocean";
import styled from "styled-components";
import { LoadingCubes } from "../shared/components";
import * as THREE from "three";
import { backgroundColor } from "../shared/theme/colors";
import { useAssetLoader } from "../shared/hooks";
import { memoryTracker } from "../engine/memory/MemoryTracker";
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
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  
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
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [canvasLoaded, setCanvasLoaded] = useState(false);

  // Memoize resource loading state to prevent unnecessary re-renders
  const resourceState = useMemo(() => ({
    isLoading,
    postsLoaded,
    resourcesReady: !isLoading && postsLoaded && posts.length > 0,
  }), [isLoading, postsLoaded, posts.length]);
  
  // Canvas is fully ready when 3D scene has finished rendering
  const canvasReady = resourceState.resourcesReady && canvasLoaded && shouldLoadCanvas;

  // Load canvas on first visit to any route and keep it loaded
  useEffect(() => {
    const isPostRoute = location.pathname.startsWith('/posts/');
    const isPostsRoute = location.pathname === '/posts';
    const isHomeRoute = location.pathname === '/';
    
    // Load canvas once for any relevant route and keep it loaded
    if (isHomeRoute || isPostsRoute || isPostRoute) {
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
    // Immediate state updates for instant response
    setSelectedPost(null);
    // Ensure canvas loads when navigating back to posts
    setHasVisitedHome(true);
    setShouldLoadCanvas(true);
    navigate("/posts");
  }, [navigate]);

  useEffect(() => {
    // Only load posts once
    if (posts.length === 0 && !postsLoaded) {
      fetch("/posts.json")
        .then((res) => {
          if (!res.ok) throw new Error("Network error");
          return res.json();
        })
        .then((data) => {
          setPosts(data);
          setAllPosts(data); // Update search context with all posts
          setPostsLoaded(true);
        })
        .catch((err) => {
          console.error("Failed to load posts:", err);
          setPostsLoaded(true); // Still mark as loaded to prevent infinite retries
        });
    }
  }, [posts.length, postsLoaded]);

  // Simplest possible detail detection for maximum speed
  const isDetail = selectedPost !== null;
  
  // Show UI immediately for direct post navigation, with loading state for canvas routes
  const showUI = resourceState.resourcesReady && (shouldLoadCanvas ? canvasLoaded : true);

  return (
    <>
      <GlobalStyle />
      {resourceState.resourcesReady && shouldLoadCanvas && (
        <PersistentCanvasWrapper hidden={isDetail}>
          <CanvasBackground>
            <LazyOceanCanvas
              posts={posts}
              onPostClick={handlePostClick}
              resources={resources}
              onLoaded={() => setCanvasLoaded(true)}
              isPaused={isDetail}
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
          {error ? (
            <div style={{ color: '#ff4444', textAlign: 'center' }}>
              <div>Loading failed: {error}</div>
              <div style={{ marginTop: '10px', fontSize: '0.8em' }}>Refresh to try again</div>
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
          <SideBar />
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
            <Route
              path="/profile"
              element={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "1.5rem 2.5rem 1.5rem 1.5rem",
                  }}
                >
                  <Profile
                    avatarUrl="https://i.pinimg.com/236x/14/67/d2/1467d25dddb40deda97737c62b375d9a.jpg"
                    name="Jane Doe"
                    title="Full-Stack Developer"
                    bio="Passionate about building performant web apps and scalable APIs."
                  />
                </div>
              }
            />
            <Route path="/*" element={<div>Page not found</div>} />
          </Routes>
        </>
      )}
    </>
  );
});

AppContent.displayName = 'AppContent';

export default AppContent;
