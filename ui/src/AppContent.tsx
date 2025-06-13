import React, { useEffect, useState, useCallback } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import SideBar from "./SideBar";
import Posts from "./Posts";
import About from "./About";
import { CanvasBackground, GlobalStyle } from "./theme/GlobalStyles";
import OceanDemoCanvas from "./OceanDemoCanvas";
import styled from "styled-components";
import { SquareLoader } from "react-spinners";
import Profile from "./Profile";
import * as THREE from "three";
import PostDetail from "./PostDetail";
import { backgroundColor } from "./theme/colors";

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
  transition: opacity 0.2s;
`;

const AppContent: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [canvasLoaded, setCanvasLoaded] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();

  const handlePostClick = useCallback(
    (slug: string) => {
      const post = posts.find((p) => p.slug === slug);
      if (post) setSelectedPost(post);
    },
    [posts],
  );

  const handleClose = useCallback(() => {
    setSelectedPost(null);
    console.log("Closing post detail");
    navigate("/posts");
  }, [navigate]);

  useEffect(() => {
    fetch("/posts.json") // fixed: no need for "../public"
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => setPosts(data))
      .catch((err) => {
        console.error("Failed to load posts:", err);
      });
  }, []);

  const location = useLocation();
  const isDetail =
    /^\/posts\/[^/]+$/.test(location.pathname) && selectedPost !== null;

  return (
    <>
      <GlobalStyle />
      {posts.length > 0 && (
        <PersistentCanvasWrapper hidden={isDetail}>
          <CanvasBackground>
            <OceanDemoCanvas
              posts={posts}
              onPostClick={handlePostClick}
              onLoaded={() => setCanvasLoaded(true)}
            />
          </CanvasBackground>
        </PersistentCanvasWrapper>
      )}

      {!canvasLoaded && (
        <LoaderOverlay>
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
          <SquareLoader
            loading
            size={55}
            color="#0ff"
            speedMultiplier={1}
            cssOverride={{
              border: "5px solid #202020",
              borderRadius: "10px",
              padding: "10px",
            }}
          />
        </LoaderOverlay>
      )}

      {canvasLoaded && (
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
