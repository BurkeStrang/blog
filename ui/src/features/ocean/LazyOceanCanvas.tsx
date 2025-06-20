import React, { lazy, Suspense, useState, useEffect } from 'react';
import LoadingCubes from '../../shared/components/LoadingCubes';
import type { Post } from '../../app/AppContent';

// Lazy load the heavy OceanDemoCanvas component
const OceanDemoCanvas = lazy(() => import('./OceanScene').then(module => ({
  default: module.default
})));

interface ResourceCache {
  textures: {
    waterNormals?: import('three').Texture;
    cloudBackground?: import('three').Texture;
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
}

/**
 * Lazy loading wrapper for OceanDemoCanvas with intersection observer
 */
const LazyOceanCanvas: React.FC<LazyOceanCanvasProps> = ({
  posts,
  onPostClick,
  resources,
  onLoaded,
  isPaused = false,
  loadTrigger = 'viewport'
}) => {
  const [shouldLoad, setShouldLoad] = useState(loadTrigger === 'immediate');
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Intersection Observer for viewport-based loading
  useEffect(() => {
    if (loadTrigger !== 'viewport' || !containerRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !shouldLoad) {
          console.log('🎯 Ocean canvas entering viewport, starting load...');
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
  const handleUserInteraction = () => {
    if (loadTrigger === 'user-interaction' && !shouldLoad) {
      console.log('👆 User interaction detected, loading Ocean canvas...');
      setShouldLoad(true);
    }
  };

  // Check if resources are ready
  const resourcesReady = React.useMemo(() => {
    return !!(
      resources.textures.waterNormals &&
      resources.textures.cloudBackground &&
      resources.models.sphere &&
      resources.models.rubiksCube &&
      resources.fonts.gentilis
    );
  }, [resources]);

  // Loading fallback component
  const LoadingFallback = () => (
    <div 
      style={{
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
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <LoadingCubes />
        <div style={{ marginTop: '16px' }}>Loading 3D Scene...</div>
        <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.7 }}>
          Optimizing for your device...
        </div>
      </div>
    </div>
  );

  // Placeholder for user interaction trigger
  const InteractionPlaceholder = () => (
    <div 
      style={{
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
      }}
      onClick={handleUserInteraction}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleUserInteraction();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label="Load 3D scene"
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌊</div>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>Click to Load 3D Scene</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>
          Interactive ocean with {posts.length} posts
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={setContainerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}
    >
      {!shouldLoad && loadTrigger === 'user-interaction' && (
        <InteractionPlaceholder />
      )}
      
      {shouldLoad && resourcesReady && (
        <Suspense fallback={<LoadingFallback />}>
          <OceanDemoCanvas
            posts={posts}
            onPostClick={onPostClick}
            resources={resources}
            onLoaded={onLoaded}
            isPaused={isPaused}
          />
        </Suspense>
      )}
      
      {shouldLoad && !resourcesReady && (
        <div 
          style={{
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
            fontSize: '16px',
            fontFamily: 'monospace'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <LoadingCubes />
            <div style={{ marginTop: '16px' }}>Loading Resources...</div>
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
              Textures, models, and fonts
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyOceanCanvas;
