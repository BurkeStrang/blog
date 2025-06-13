import React, { useEffect, useState, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { SideBar } from "../features/layout";
import { Posts, PostDetail } from "../features/posts";
import { About, Profile } from "../features/pages";
import { CanvasBackground, GlobalStyle } from "../shared/theme/GlobalStyles";
import { OceanScene } from "../features/ocean";
import styled from "styled-components";
import { LoadingSpinner } from "../shared/components";
import * as THREE from "three";
import { backgroundColor } from "../shared/theme/colors";
import { useAssetLoader } from "../shared/hooks";
import { memoryTracker } from "../engine/memory/MemoryTracker";

export interface Post {
  slug: string;
  title: string;
  body: string;
  position?: THREE.Vector3;
  date?: Date;
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

const AppContent: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();
  
  // Preload all assets once
  const { isLoading, error, resources } = useAssetLoader();
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  
  // Resources are ready when both assets and posts are loaded
  const resourcesReady = !isLoading && postsLoaded && posts.length > 0;
  // Canvas is fully ready when 3D scene has finished rendering
  const canvasReady = resourcesReady && canvasLoaded;

  // Memory tracking (async to avoid blocking)
  useEffect(() => {
    if (canvasReady) {
      // Use setTimeout to make memory tracking non-blocking
      setTimeout(() => {
        memoryTracker.takeSnapshot('AppContent-Ready');
      }, 0);
    }
  }, [canvasReady]);

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

  return (
    <>
      <GlobalStyle />
      {resourcesReady && (
        <PersistentCanvasWrapper hidden={isDetail}>
          <CanvasBackground>
            <OceanScene
              posts={posts}
              onPostClick={handlePostClick}
              resources={resources}
              onLoaded={() => setCanvasLoaded(true)}
              isPaused={isDetail}
            />
          </CanvasBackground>
        </PersistentCanvasWrapper>
      )}

      {!canvasReady && (
        <LoaderOverlay>
          {error ? (
            <div style={{ color: '#ff4444', textAlign: 'center' }}>
              <div>Loading failed: {error}</div>
              <div style={{ marginTop: '10px', fontSize: '0.8em' }}>Refresh to try again</div>
            </div>
          ) : (
            <LoadingSpinner
              size={120}
              color="#0ff"
            />
          )}
        </LoaderOverlay>
      )}

      {canvasReady && (
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
};

export default AppContent;
