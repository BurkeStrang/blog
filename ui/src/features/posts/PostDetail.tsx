import React from "react";
import { useParams, Navigate } from "react-router-dom";
import { Post } from "../../app/AppContent";
import styled from "styled-components";
import { backgroundColor, lightgrey, accent } from "../../shared/theme/colors";

const Article = styled.article`
  max-width: 800px;
  margin: 2rem auto;
  padding: 3rem 2rem 2rem 2rem;
  background: ${backgroundColor};
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  position: relative;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    margin: 1rem;
    border-radius: 8px;
    max-height: calc(100vh - 2rem);
  }
`;

const Title = styled.h1`
  color: ${accent};
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  letter-spacing: -0.02em;
  text-align: center;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 2rem;
    margin-bottom: 2rem;
  }
`;

const Content = styled.div`
  color: ${lightgrey};
  line-height: 1.8;
  font-size: 1.125rem;
  text-align: center;
  max-width: 650px;
  margin: 0 auto;
  
  > * + * {
    margin-top: 1.5em;
  }
  
  p {
    margin-bottom: 1.5em;
  }
  
  h2, h3, h4, h5, h6 {
    color: ${accent};
    font-weight: 600;
    margin-top: 2em;
    margin-bottom: 1em;
    text-align: center;
  }
  
  h2 { font-size: 1.5em; }
  h3 { font-size: 1.3em; }
  h4 { font-size: 1.1em; }
  
  blockquote {
    border-left: 4px solid ${accent};
    padding-left: 1.5rem;
    margin: 2rem 0;
    font-style: italic;
    color: ${accent};
    text-align: left;
  }
  
  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Fira Code', 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  pre {
    background: rgba(255, 255, 255, 0.05);
    padding: 1.5rem;
    border-radius: 8px;
    overflow-x: auto;
    margin: 2rem 0;
    text-align: left;
  }
  
  ul, ol {
    text-align: left;
    padding-left: 2rem;
    margin: 1.5rem 0;
  }
  
  li {
    margin-bottom: 0.5em;
  }
  
  a {
    color: ${accent};
    text-decoration: none;
    border-bottom: 1px solid ${accent};
    transition: all 0.2s ease;
    
    &:hover {
      color: ${accent};
      border-bottom-color: ${accent};
    }
  }
  
  @media (max-width: 768px) {
    font-size: 1rem;
    line-height: 1.7;
  }
`;

const BackButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 3rem;
  padding: 2rem 0 1rem 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  bottom: 0;
  background: linear-gradient(to bottom, transparent 0%, ${backgroundColor} 20%, ${backgroundColor} 100%);
`;

const BackButton = styled.button`
  padding: 0.875rem 2rem;
  font-size: 1rem;
  background: transparent;
  color: ${lightgrey};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: ${accent}
    color: ${accent};
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
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
