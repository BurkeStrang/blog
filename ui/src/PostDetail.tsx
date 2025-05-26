import { useParams, Navigate } from "react-router-dom";
import { Post } from "./AppContent";
import styled from "styled-components";
import { backgroundColor, lightgrey, primary } from "./theme/GlobalStyles";

const Article = styled.article`
  max-width: 90vh;
  margin: auto;
  padding: 1px;
  background-color: ${backgroundColor};
  border-radius: 1px;
  box-shadow: 4px 4px 16px rgba(0, 0, 0, 0.2);
  max-height: 80vh;
  overflow-y: auto;
`;

const Title = styled.h1`
  color: ${primary};
  margin-bottom: 1px;
`;

const Content = styled.div`
  color: ${lightgrey};
  line-height: 1.6;
  > * + * {
    margin-top: 2px;
  }
`;

interface PostDetailProps {
  allPosts: Post[];
}

export default function PostDetail({ allPosts }: PostDetailProps) {
  const { slug } = useParams<{ slug: string }>();
  const post = allPosts.find((p) => p.slug === slug);

  if (!post) {
    return <Navigate to="/posts" replace />;
  }

  return (
    <Article>
      <Title>{post.title}</Title>
      <Content dangerouslySetInnerHTML={{ __html: post.body }} />
    </Article>
  );
}
