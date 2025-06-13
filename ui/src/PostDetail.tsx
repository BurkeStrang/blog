import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { Post } from "./AppContent";
import styled from "styled-components";
import { backgroundColor, lightgrey, primary, accent } from "./theme/colors";

const Article = styled.article`
  margin: 4rem auto;
  padding: 2.5rem 2rem 4rem 2rem;
  background: ${backgroundColor};
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.26), 0 1.5px 0 0 ${accent} inset;
  position: relative;
  min-height: 50vh;
  max-height: 80vh;
  overflow-y: auto;
  border: 1.5px solid ${accent};
`;

const Title = styled.h1`
  color: ${primary};
  font-size: 2.2rem;
  font-weight: bold;
  margin-bottom: 2.5rem;
  letter-spacing: 0.03em;
  text-align: center;
`;

const Content = styled.div`
  color: ${lightgrey};
  line-height: 1.7;
  font-size: 1.13rem;
  > * + * {
    margin-top: 1.35em;
  }
  a {
    color: ${accent};
    text-decoration: underline;
    &:hover {
      opacity: 0.85;
    }
  }
`;

const BackButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  position: sticky;
  bottom: 0;
  background: linear-gradient(0deg, ${backgroundColor} 85%, transparent 100%);
  padding-top: 2rem;
  padding-bottom: 1.5rem;
  margin-top: 2rem;
`;

const BackButton = styled.button`
  padding: 0.7rem 2.1rem;
  font-size: 1.08rem;
  background: ${accent};
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2.5px 16px rgba(0,0,0,0.07);
  /* Removed transitions for instant response */
  &:hover {
    background: ${primary};
  }
`;

interface PostDetailProps {
  allPosts: Post[];
  handleClose: () => void;
}

const PostDetail = React.memo(function PostDetail({ allPosts, handleClose }: PostDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const post = allPosts.find((p) => p.slug === slug);

  if (!post) {
    return <Navigate to="/posts" replace />;
  }

  // Optimize handleClose to prevent re-renders
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleClose();
  }, [handleClose]);

  return (
    <Article>
      <Title>{post.title}</Title>
      <Content dangerouslySetInnerHTML={{ __html: post.body }} />
      <BackButtonContainer>
        <BackButton onClick={handleClick}>← Back to posts</BackButton>
      </BackButtonContainer>
    </Article>
  );
});

export default PostDetail;
