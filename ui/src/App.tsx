import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./Header";
import Posts from "./Posts";
import Home from "./Home";
import { CanvasBackground, GlobalStyle, secondary } from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";
import { Vector3 } from "three";
import styled from "styled-components";
import ClipLoader from "react-spinners/ClipLoader";

export interface Post {
  id: string;
  title: string;
  body: string;
}

const posts: Post[] = [
  {
    id: "1",
    title: "Mastering Vim Motions and Text Objects",
    body: `
      <p><em>Posted on May 7, 2025 by Burke</em></p>

      <h2>What Are Motions?</h2>
      <p>
        Motions in Vim are commands that move the cursor. They're used to
        tell other commands (like <code>d</code> for delete or <code>y</code> for yank) how much text to act on.
        For example, <code>d$</code> means "delete to the end of the line".
      </p>
      <ul>
        <li><code>w</code> – next word</li>
        <li><code>e</code> – end of word</li>
        <li><code>0</code> – beginning of line</li>
        <li><code>$</code> – end of line</li>
        <li><code>gg</code> – beginning of file</li>
        <li><code>G</code> – end of file</li>
      </ul>

      <h2>What Are Text Objects?</h2>
      <p>
        Text objects are more semantic than motions. They represent structured selections like
        "a word", "a sentence", "a paragraph", or "a block inside quotes".
      </p>
      <p>
        Text objects usually follow the pattern <code>operator + a/i + object</code>.
      </p>
      <ul>
        <li><code>diw</code> – delete inner word (just the word)</li>
        <li><code>daw</code> – delete a word (including whitespace)</li>
        <li><code>ci"</code> – change inner quotes</li>
        <li><code>ca(</code> – change a parenthesis block (includes parens)</li>
        <li><code>yi]</code> – yank inside square brackets</li>
      </ul>
      <p>Think of <code>i</code> as "inner" and <code>a</code> as "around".</p>

      <h2>Combining Motions and Operators</h2>
      <p>
        You can combine motions and text objects with operators like:
      </p>
      <ul>
        <li><code>d</code> – delete</li>
        <li><code>y</code> – yank (copy)</li>
        <li><code>c</code> – change</li>
        <li><code>v</code> – visual select</li>
      </ul>

      <p>Examples:</p>
      <pre><code>d3w    "delete three words"
y$     "yank to end of line"
caw    "change a word including whitespace"
vi"    "select inner quotes"</code></pre>

      <p>Need a printable Vim cheatsheet? <a href="https://vim.rtorr.com/">Check this out</a>.</p>
    `,
  },
  {
    id: "2",
    title: "Second Post long title",
    body: "<p>Dark theme with neon green highlights and raw WebGL patterns.</p>",
  },
  {
    id: "3",
    title: "Third Post long title",
    body: "<p>Dark theme with neon green highlights and raw WebGL patterns.</p>",
  },
];

const LoaderOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const App: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [canvasLoaded, setCanvasLoaded] = useState(false);

  const handlePostClick = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) {
      setSelectedPost(post);
    }
  };

  const handleClose = () => {
    setSelectedPost(null);
  };

  return (
    <>
      <GlobalStyle />
      {/* spinner until three.js finishes initializing */}
      {!canvasLoaded && (
        <LoaderOverlay>
          <ClipLoader size={60} color={secondary} loading={!canvasLoaded} />
        </LoaderOverlay>
      )}
      <CanvasBackground>
        <OceanDemoCanvas
          posts={posts}
          onPostClick={handlePostClick}
          camera={new Vector3(488.401, 62.471, -80.716)}
          onLoaded={() => setCanvasLoaded(true)}
        />
      </CanvasBackground>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/posts"
            element={
              <Posts  selectedPost={selectedPost} handleClose={handleClose} />
            }
          />
        </Routes>
      </Router>
    </>
  );
};

export default App;
