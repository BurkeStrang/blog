import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { primary } from '../../shared/theme/colors';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 2rem;
`;

const ErrorCode = styled.h1`
  font-size: 6rem;
  font-weight: bold;
  color: ${primary};
  margin: 0;
  text-shadow:
    0 0 5px #0ff,
    0 0 10px #0ff,
    0 0 20px #0ff;
`;

const ErrorMessage = styled.h2`
  font-size: 1.5rem;
  color: ${primary};
  margin: 1rem 0;
`;

const ErrorDescription = styled.p`
  font-size: 1rem;
  color: #666;
  margin: 1rem 0 2rem;
  max-width: 500px;
`;

const HomeButton = styled.button`
  background: none;
  border: 2px solid ${primary};
  color: ${primary};
  padding: 0.75rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${primary};
    color: #000;
    text-shadow: none;
    box-shadow:
      0 0 10px #0ff,
      0 0 20px #0ff;
  }
`;

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/posts');
  };

  return (
    <NotFoundContainer>
      <ErrorCode>404</ErrorCode>
      <ErrorMessage>Page Not Found</ErrorMessage>
      <ErrorDescription>
        The page you&apos;re looking for doesn&apos;t exist. It might have been moved, deleted, or you entered the wrong URL.
      </ErrorDescription>
      <HomeButton onClick={handleGoHome}>
        Go to Blog
      </HomeButton>
    </NotFoundContainer>
  );
};