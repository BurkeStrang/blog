import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingCubesProps {
  size?: number;
  color?: string;
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

const Cube = styled.div<{ $size: number; $color: string; $delay: number }>`
  width: ${props => props.$size * 0.2}px;
  height: ${props => props.$size * 0.2}px;
  background: linear-gradient(145deg, #222, #444);
  border: 2px solid ${props => props.$color};
  border-radius: 4px;
  box-shadow: 0 0 15px ${props => props.$color};
  margin: 0 5px;
  animation: ${pulse} 1.5s ease-in-out infinite;
  animation-delay: ${props => props.$delay}s;
`;

const LoadingCubes: React.FC<LoadingCubesProps> = ({ size = 100, color = '#0ff' }) => (
  <LoaderContainer $size={size}>
    {Array.from({ length: 3 }, (_, i) => (
      <Cube key={i} $size={size} $color={color} $delay={i * 0.3} />
    ))}
  </LoaderContainer>
);

export default LoadingCubes;
