import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingCubesProps {
  size?: number;
}

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
`;

const LoaderContainer = styled.div<{ $size: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  position: relative;
`;

const Cube = styled.div<{ $size: number; $delay: number }>`
  width: ${props => props.$size * 0.2}px;
  height: ${props => props.$size * 0.2}px;
  background: linear-gradient(145deg, var(--color-cube-bg-start), var(--color-cube-bg-end));
  border: 2px solid var(--color-cube-accent);
  border-radius: 2px;
  box-shadow: 0 0 15px var(--color-cube-accent);
  margin: 0 5px;
  animation: ${pulse} 1.5s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`;

const LoadingCubes: React.FC<LoadingCubesProps> = ({ size = 120 }) => (
  <LoaderContainer $size={size}>
    {Array.from({ length: 3 }, (_, i) => (
      <Cube key={i} $size={size} $delay={i * 0.3} />
    ))}
  </LoaderContainer>
);

export default LoadingCubes;
