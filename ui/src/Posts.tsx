import React, { useState } from "react";
import {
  CanvasBackground,
  Page,
  Content,
  PostCard,
  MinimalButton,
} from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";
import { Vector3 } from "three";

interface Post {
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

const Posts: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const handlePostClick = (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (post) setSelectedPost(post);
  };

  const handleClose = () => setSelectedPost(null);

  return (
    <>
      <CanvasBackground>
        <OceanDemoCanvas
          posts={posts}
          onPostClick={handlePostClick}
//Camera position: x=-163.04928470083573, y=10.91679531642352, z=97.03917590205039
          camera={new Vector3(-163.0493, 10.9168, 97.0392)}
        />
      </CanvasBackground>
      <Page>
        {selectedPost && (
          <Content>
            <PostCard>
              <h2>{selectedPost.title}</h2>
              <div dangerouslySetInnerHTML={{ __html: selectedPost.body }} />
              <MinimalButton onClick={handleClose}>Close</MinimalButton>
            </PostCard>
          </Content>
        )}
      </Page>
    </>
  );
};

export default Posts;
