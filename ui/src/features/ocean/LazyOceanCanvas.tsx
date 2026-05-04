import React, { lazy, Suspense, memo, useCallback, useMemo, useState, useEffect } from 'react';
import LoadingCubes from '../../shared/components/LoadingCubes';
import type { Post } from '../../app/AppContent';

// Lazy load the heavy OceanDemoCanvas component
const OceanDemoCanvas = lazy(() => import('./OceanScene').then(module => ({
  default: module.default
})));

interface ResourceCache {
  textures: {
    waterNormals?: import('three').Texture;
  };
  models: {
    sphere?: import('three/examples/jsm/loaders/GLTFLoader').GLTF;
    rubiksCube?: import('three/examples/jsm/loaders/GLTFLoader').GLTF;
  };
  fonts: {
    gentilis?: import('three/examples/jsm/loaders/FontLoader').Font;
  };
}

interface LazyOceanCanvasProps {
  posts: Post[];
  onPostClick?: (slug: string) => void;
  resources: ResourceCache;
  onLoaded?: () => void;
  isPaused?: boolean;
  loadTrigger?: 'immediate' | 'viewport' | 'user-interaction';
  visiblePostSlugs?: Set<string>;
  sortedPosts?: Post[];
  isSorting?: boolean;
}

/**
 * Lazy loading wrapper for OceanDemoCanvas with intersection observer
 */
const loadingOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  color: 'white',
  fontSize: '18px',
  fontFamily: 'monospace'
};

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%'
};

const interactionPlaceholderStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  color: 'white',
  cursor: 'pointer',
  userSelect: 'none'
};

const resourcesLoadingStyle: React.CSSProperties = {
  ...loadingOverlayStyle,
  fontSize: '16px',
};

const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div style={loadingOverlayStyle}>
      <div style={{ textAlign: 'center' }}>
        <LoadingCubes />
      </div>
    </div>
  );
});

interface InteractionPlaceholderProps {
  postCount: number;
  onInteraction: () => void;
}

const InteractionPlaceholder = memo(function InteractionPlaceholder({
  postCount,
  onInteraction,
}: InteractionPlaceholderProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      onInteraction();
    }
  }, [onInteraction]);

  return (
    <div 
      style={interactionPlaceholderStyle}
      onClick={onInteraction}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Load 3D scene"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌊</div>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>Click to Load 3D Scene</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>
          Interactive ocean with {postCount} posts
        </div>
      </div>
    </div>
  );
});

const LazyOceanCanvas = memo(function LazyOceanCanvas({
  posts,
  onPostClick,
  resources,
  onLoaded,
  isPaused = false,
  loadTrigger = 'viewport',
  visiblePostSlugs,
  sortedPosts,
  isSorting = false
}: LazyOceanCanvasProps) {
  const [shouldLoad, setShouldLoad] = useState(loadTrigger === 'immediate');
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Intersection Observer for viewport-based loading
  useEffect(() => {
    if (loadTrigger !== 'viewport' || !containerRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !shouldLoad) {
          setShouldLoad(true);
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1
      }
    );

    observer.observe(containerRef);

    return () => {
      observer.disconnect();
    };
  }, [containerRef, loadTrigger, shouldLoad]);

  // User interaction loading
  const handleUserInteraction = useCallback(() => {
    if (loadTrigger === 'user-interaction' && !shouldLoad) {
      setShouldLoad(true);
    }
  }, [loadTrigger, shouldLoad]);

  // Check if resources are ready
  const resourcesReady = useMemo(() => {
    return !!(
      resources.textures.waterNormals &&
      resources.models.sphere &&
      resources.models.rubiksCube &&
      resources.fonts.gentilis
    );
  }, [
    resources.textures.waterNormals,
    resources.models.sphere,
    resources.models.rubiksCube,
    resources.fonts.gentilis,
  ]);

  return (
    <div 
      ref={setContainerRef}
      style={containerStyle}
    >
      {!shouldLoad && loadTrigger === 'user-interaction' && (
        <InteractionPlaceholder
          postCount={posts.length}
          onInteraction={handleUserInteraction}
        />
      )}
      
      {shouldLoad && resourcesReady && (
        <Suspense fallback={<LoadingFallback />}>
          <OceanDemoCanvas
            posts={posts}
            onPostClick={onPostClick}
            resources={resources}
            onLoaded={onLoaded}
            isPaused={isPaused}
            visiblePostSlugs={visiblePostSlugs}
            sortedPosts={sortedPosts}
            isSorting={isSorting}
          />
        </Suspense>
      )}
      
      {shouldLoad && !resourcesReady && (
        <div 
          style={resourcesLoadingStyle}
        >
          <div style={{ textAlign: 'center' }}>
            <LoadingCubes />
          </div>
        </div>
      )}
    </div>
  );
});

LazyOceanCanvas.displayName = 'LazyOceanCanvas';

export default LazyOceanCanvas;
