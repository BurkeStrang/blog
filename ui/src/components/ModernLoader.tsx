import React from 'react';
import styled, { keyframes } from 'styled-components';

interface ModernLoaderProps {
  size?: number;
  color?: string;
}

const rotateCube = keyframes`
  0% {
    transform: rotateX(0deg) rotateY(0deg);
  }
  100% {
    transform: rotateX(360deg) rotateY(360deg);
  }
`;

const pulseCube = keyframes`
  0%, 100% {
    transform: scale(1);
    box-shadow: 
      0 0 20px currentColor,
      inset 0 0 20px rgba(0, 0, 0, 0.8);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 
      0 0 40px currentColor,
      0 0 60px currentColor,
      inset 0 0 20px rgba(0, 0, 0, 0.6);
  }
`;

const orbitCubes = keyframes`
  0% {
    transform: rotateZ(0deg);
  }
  100% {
    transform: rotateZ(360deg);
  }
`;

const floatCube = keyframes`
  0%, 100% {
    transform: translateY(0px) rotateX(0deg) rotateY(0deg);
  }
  50% {
    transform: translateY(-8px) rotateX(180deg) rotateY(180deg);
  }
`;

const neonGlow = keyframes`
  0%, 100% {
    box-shadow: 
      0 0 10px currentColor,
      0 0 20px currentColor,
      0 0 30px currentColor,
      inset 0 0 10px rgba(0, 0, 0, 0.8);
  }
  50% {
    box-shadow: 
      0 0 20px currentColor,
      0 0 30px currentColor,
      0 0 40px currentColor,
      0 0 50px currentColor,
      inset 0 0 10px rgba(0, 0, 0, 0.6);
  }
`;

const LoaderContainer = styled.div<{ $size: number }>`
  position: relative;
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
`;

const CentralCube = styled.div<{ $size: number; $color: string }>`
  position: absolute;
  width: ${props => props.$size * 0.25}px;
  height: ${props => props.$size * 0.25}px;
  background: linear-gradient(135deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%);
  border: 2px solid ${props => props.$color};
  color: ${props => props.$color};
  animation: ${rotateCube} 4s linear infinite, ${pulseCube} 2s ease-in-out infinite;
  transform-style: preserve-3d;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(45deg, 
      ${props => props.$color}20, 
      transparent 30%, 
      transparent 70%, 
      ${props => props.$color}20
    );
    z-index: -1;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 4px;
    height: 4px;
    background: ${props => props.$color};
    transform: translate(-50%, -50%);
    border-radius: 1px;
    box-shadow: 0 0 8px ${props => props.$color};
  }
`;

const OrbitContainer = styled.div<{ $size: number; $delay: number }>`
  position: absolute;
  width: ${props => props.$size * 0.8}px;
  height: ${props => props.$size * 0.8}px;
  animation: ${orbitCubes} ${props => 3 + props.$delay}s linear infinite;
  animation-delay: ${props => props.$delay * 0.5}s;
`;

const OrbitCube = styled.div<{ $size: number; $color: string; $position: number }>`
  position: absolute;
  width: ${props => props.$size * 0.12}px;
  height: ${props => props.$size * 0.12}px;
  background: linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 50%, #0a0a0a 100%);
  border: 1px solid ${props => props.$color};
  color: ${props => props.$color};
  animation: ${floatCube} 2s ease-in-out infinite, ${neonGlow} 3s ease-in-out infinite;
  animation-delay: ${props => props.$position * 0.2}s;
  
  ${props => {
    const angle = (props.$position * 360) / 6;
    const radius = props.$size * 0.35;
    const x = Math.cos(angle * Math.PI / 180) * radius;
    const y = Math.sin(angle * Math.PI / 180) * radius;
    return `
      left: calc(50% + ${x}px);
      top: calc(50% + ${y}px);
      transform: translate(-50%, -50%);
    `;
  }}
  
  &::before {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    bottom: 2px;
    background: linear-gradient(45deg, 
      transparent 0%, 
      ${props => props.$color}10 50%, 
      transparent 100%
    );
    border: 1px solid ${props => props.$color}40;
  }
`;

const NeonBorder = styled.div<{ $size: number; $color: string; $delay: number }>`
  position: absolute;
  width: ${props => props.$size * (0.9 + props.$delay * 0.1)}px;
  height: ${props => props.$size * (0.9 + props.$delay * 0.1)}px;
  border: 1px solid ${props => props.$color}30;
  transform: rotate(${props => props.$delay * 45}deg);
  animation: ${orbitCubes} ${props => 8 + props.$delay * 2}s linear infinite reverse;
  
  &::before, &::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: ${props => props.$color};
    box-shadow: 0 0 10px ${props => props.$color};
  }
  
  &::before {
    top: -3px;
    left: -3px;
  }
  
  &::after {
    bottom: -3px;
    right: -3px;
  }
`;

const ModernLoader: React.FC<ModernLoaderProps> = ({ 
  size = 100, 
  color = '#0ff' 
}) => {
  return (
    <LoaderContainer $size={size}>
      {/* Neon border frames */}
      <NeonBorder $size={size} $color={color} $delay={0} />
      <NeonBorder $size={size} $color={color} $delay={1} />
      <NeonBorder $size={size} $color={color} $delay={2} />
      
      {/* Orbiting cubes */}
      <OrbitContainer $size={size} $delay={0}>
        {Array.from({ length: 6 }, (_, i) => (
          <OrbitCube
            key={i}
            $size={size}
            $color={color}
            $position={i}
          />
        ))}
      </OrbitContainer>
      
      <OrbitContainer $size={size} $delay={1}>
        {Array.from({ length: 4 }, (_, i) => (
          <OrbitCube
            key={`inner-${i}`}
            $size={size * 0.7}
            $color={color}
            $position={i * 1.5}
          />
        ))}
      </OrbitContainer>
      
      {/* Central rotating cube */}
      <CentralCube $size={size} $color={color} />
    </LoaderContainer>
  );
};

export default ModernLoader;