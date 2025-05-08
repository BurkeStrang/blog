import React from "react";
import { Page, Content, PostCard, MinimalButton } from "./components/Styled";
import { Post } from "./App";

interface PostsProps {
  selectedPost: Post | null;
  handleClose: () => void;
}

const Posts: React.FC<PostsProps> = ({ selectedPost, handleClose }) => {
  return (
    <>
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
