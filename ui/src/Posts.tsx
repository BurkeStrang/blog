import React from "react";

import {
  GlobalStyle,
  CanvasBackground,
  Page,
  Header,
  Content,
  PostCard,
} from "./components/Styled";
import OceanDemoCanvas from "./OceanDemoCanvas";

interface Post {
  id: string;
  title: string;
  body: string;
}
const posts: Post[] = [
  {
    id: "1",
    title: "Welcome",
    body: "<p>This is a brutalist blog with a Three.js flock background.</p>",
  },
  {
    id: "2",
    title: "Second Post",
    body: "<p>Dark theme with neon green highlights and raw WebGL patterns.</p>",
  },
];

// ————— Blog —————
const Posts: React.FC = () => (
  <>
    <GlobalStyle />
    <CanvasBackground>
      <OceanDemoCanvas />
    </CanvasBackground>

    <Page>
      <Header>
        <h1>Posts</h1>
      </Header>

      <Content>
        {posts.map((p) => (
          <PostCard key={p.id}>
            <h2>{p.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: p.body }} />
          </PostCard>
        ))}
      </Content>
    </Page>
  </>
);

export default Posts;
