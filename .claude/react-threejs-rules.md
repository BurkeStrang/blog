# React + Three.js Development Rules

## Memory Management & Performance

### Three.js Disposal
- **ALWAYS** dispose of Three.js objects when components unmount
- Call `geometry.dispose()`, `material.dispose()`, `texture.dispose()`
- Use `scene.remove()` and traverse children for complex cleanup
- Cancel animation frames with `cancelAnimationFrame()` in cleanup
- Call `renderer.dispose()` and `renderer.forceContextLoss()` on unmount

### Object Reuse
- Reuse geometries and materials across multiple meshes
- Implement object pooling for frequently created/destroyed objects
- Use `useMemo` for expensive Three.js object creation
- Share textures and materials when possible

### Animation Optimization
- Use `useRef` to store animation IDs and Three.js objects
- Implement proper cleanup in `useEffect` return functions
- Use `requestAnimationFrame` for smooth animations
- Consider using `useFrame` from `@react-three/fiber` when available

## React Best Practices

### Component Structure
- Keep components small and focused (< 200 lines)
- Extract custom hooks for Three.js logic
- Use TypeScript for all components and interfaces
- Implement proper prop validation with TypeScript

### State Management
- Use `useState` for local component state
- Use `useReducer` for complex state logic
- Implement context for shared Three.js resources
- **NEVER** use localStorage/sessionStorage in artifacts

### Custom Hooks
- Create `useThreeJS()` hooks for reusable Three.js logic
- Implement `useMemoryMonitor()` for debugging
- Use `useResizeObserver()` for responsive canvas handling
- Extract animation logic into custom hooks

### Error Boundaries
- Wrap Three.js components in error boundaries
- Provide fallback UI for WebGL context loss
- Handle unsupported browser scenarios gracefully

## Code Organization

### File Structure
```
src/
├── components/
│   ├── three/          # Three.js specific components
│   ├── ui/             # Reusable UI components
│   └── layout/         # Layout components
├── hooks/
│   ├── useThreeJS.ts   # Three.js custom hooks
│   └── useAnimation.ts # Animation hooks
├── utils/
│   ├── three-helpers.ts # Three.js utilities
│   └── memory.ts       # Memory management utilities
└── types/
    └── three.ts        # Three.js type definitions
```

### Import Organization
```typescript
// External libraries
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Internal utilities
import { disposeObject } from '@/utils/three-helpers';

// Components
import { Canvas } from '@/components/ui/Canvas';

// Types
import type { ThreeJSScene } from '@/types/three';
```

## Performance Guidelines

### Canvas and Rendering
- Use single canvas per page when possible
- Implement viewport culling for off-screen objects
- Use LOD (Level of Detail) for complex scenes
- Enable hardware acceleration via CSS

### Bundle Optimization
- Use dynamic imports for Three.js addons
- Implement code splitting for heavy 3D components
- Tree-shake unused Three.js modules
- Optimize texture sizes and formats

### Responsive Design
- Handle canvas resizing properly
- Update camera aspect ratio on resize
- Use `ResizeObserver` over window resize events
- Implement mobile-specific optimizations

## Coding Standards

### TypeScript Usage
- Define interfaces for all Three.js objects
- Use strict typing for mesh, geometry, material props
- Create type guards for Three.js object validation
- Implement proper error handling with typed catches

### Naming Conventions
- Use camelCase for variables and functions
- Use PascalCase for components and types
- Prefix Three.js objects with descriptive names
- Use meaningful names for refs (e.g., `sceneRef`, `rendererRef`)

### Error Handling
- Always check for WebGL support
- Handle context loss gracefully
- Provide meaningful error messages
- Log performance warnings in development

## Security & Best Practices

### Data Handling
- Validate all external 3D model inputs
- Sanitize user-provided shader code
- Use CORS properly for texture loading
- Implement proper asset caching strategies

### Accessibility
- Provide alternative content for non-WebGL browsers
- Add keyboard navigation where applicable
- Include proper ARIA labels for 3D controls
- Offer reduced motion options

## Testing Guidelines

### Unit Tests
- Test custom hooks with React Testing Library
- Mock Three.js objects in tests
- Test memory cleanup in component tests
- Verify proper disposal of resources

### Integration Tests
- Test WebGL context creation
- Verify proper canvas mounting/unmounting
- Test responsive behavior
- Check memory usage over time

## Development Tools

### Debugging
- Use Three.js devtools browser extension
- Implement memory monitoring in development
- Add performance profiling for complex scenes
- Use React DevTools Profiler for component performance

### Code Quality
- Use ESLint with React and TypeScript rules
- Implement Prettier for consistent formatting
- Use Husky for pre-commit hooks
- Run tests in CI/CD pipeline

## Example Component Template

```typescript
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { disposeThreeObject } from '@/utils/three-helpers';

interface ThreeSceneProps {
  width: number;
  height: number;
  onLoad?: () => void;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ 
  width, 
  height, 
  onLoad 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();

  const cleanup = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    
    if (sceneRef.current) {
      disposeThreeObject(sceneRef.current);
    }
    
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current.forceContextLoss();
    }
  }, []);

  useEffect(() => {
    // Initialize Three.js scene
    // ... setup code
    
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    // Handle resize
    if (rendererRef.current) {
      rendererRef.current.setSize(width, height);
    }
  }, [width, height]);

  return <div ref={mountRef} className="three-scene" />;
};
```
