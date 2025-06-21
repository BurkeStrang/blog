import React, { useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  PlaneGeometry,
  Vector3,
  ShaderMaterial,
  WebGLRenderer,
  FogExp2,
  Texture,
} from "three";
import { Water } from "three/examples/jsm/objects/Water";
import OceanCamera from "./OceanCamera";
import { PostCube } from "../posts";
import { PostNavigation } from "../posts";
import type { Post } from "../../app/AppContent";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { memoryProfiler } from "../../engine/memory";
import { GeometryPool, lodManager } from "../../engine/rendering";

// TypeScript augmentation for outputEncoding
declare module "three" {
  interface WebGLRenderer {
    outputEncoding: number;
  }
}

const NO_TONE_MAPPING = 0;
const LINEAR_ENCODING = 3000;

interface PerformanceMode {
  isLowEnd: boolean;
  textureQuality: string;
  particleCount: number;
  enableBloom: boolean;
}

// Memory-optimized Ocean Scene with preloaded resources
const OceanScene: React.FC<{ waterNormals: Texture; performanceMode: PerformanceMode }> = ({ 
  waterNormals, 
  performanceMode 
}) => {
  const { scene } = useThree();
  const waterRef = useRef<Water>(null!);

  useEffect(() => {
    // Only set fog once
    scene.fog = new FogExp2(0x2a2a38, 0.0009);

    // Adaptive geometry based on performance
    const segments = performanceMode.isLowEnd ? 1 : 2;
    const textureSize = performanceMode.isLowEnd ? 128 : 256;
    
    // Use geometry pool for memory efficiency
    const geo = GeometryPool.getGeometry(
      `water-${segments}`,
      () => new PlaneGeometry(10000, 10000, segments, segments)
    );
    
    const water = new Water(geo, {
      textureWidth: textureSize,
      textureHeight: textureSize,
      waterNormals,
      sunColor: 0x00000f,
      waterColor: 0x111111,
      distortionScale: performanceMode.isLowEnd ? 1.5 : 3.7,
      fog: Boolean(scene.fog),
    });

    // Material setup (transparency, glow, etc.)
    water.material.transparent = true;
    water.material.uniforms.alpha.value = 0.99;
    water.material.opacity = 0.99;
    water.material.uniforms.waterColor.value.set(0x00000f);
    water.material.uniforms.distortionScale.value = 0.5;
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>;
         // Bioluminescent glow
         gl_FragColor.rgb += vec3(0.4, 0.4, 0.4) * pow(dot(gl_FragColor.rgb, vec3(1.0)), 2.0);
        `
      );
    };
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    waterRef.current = water;

    // LOD setup for water based on camera distance
    lodManager.addLODObject('water', new Vector3(0, 0, 0), [
      { distance: 1000, object: water },
      { distance: 5000, object: water }
    ]);

    return () => {
      scene.remove(water);
      GeometryPool.releaseGeometry(geo);
      water.material.dispose();
    };
  }, [scene, waterNormals, performanceMode]);

  useFrame((_, delta) => {
    if (waterRef.current) {
      const mat = waterRef.current.material as ShaderMaterial & {
        uniforms: { time: { value: number } };
      };
      mat.uniforms.time.value += delta;
    }
    
    // Update LOD system
    lodManager.update();
  });

  return null;
};

// Background: use preloaded texture
const CloudBackground: React.FC<{ texture: Texture }> = ({ texture }) => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = texture;
  }, [scene, texture]);
  return null;
};

interface ResourceCache {
  textures: {
    waterNormals?: Texture;
    cloudBackground?: Texture;
  };
  models: {
    sphere?: import('three/examples/jsm/loaders/GLTFLoader').GLTF;
    rubiksCube?: import('three/examples/jsm/loaders/GLTFLoader').GLTF;
  };
  fonts: {
    gentilis?: import('three/examples/jsm/loaders/FontLoader').Font;
  };
}

interface OceanDemoCanvasProps {
  posts: Post[];
  onPostClick?: (slug: string) => void;
  resources: ResourceCache;
  onLoaded?: () => void;
  isPaused?: boolean;
  visiblePostSlugs?: Set<string>; // New prop to track which posts should be visible
  sortedPosts?: Post[]; // New prop for sorted posts from SearchContext
  isSorting?: boolean; // New prop to indicate sorting is happening
}

const OceanDemoCanvas: React.FC<OceanDemoCanvasProps> = ({
  posts,
  onPostClick,
  resources,
  isPaused = false,
  onLoaded,
  visiblePostSlugs,
  sortedPosts,
  isSorting = false,
}) => {
  // Original positions for all posts (used when no search filter)
  const originalPositions = useMemo(
    () => {
      if (!posts || !Array.isArray(posts) || posts.length === 0) return [];
      return posts
        .filter(post => post) // Filter out any undefined posts
        .map((_, i) => new Vector3(i * 50 - (posts.length - 1) * 25, -8.5, i * 40));
    },
    [posts]
  );

  // Compacted positions - use sorted posts for positioning
  const compactedPositions = useMemo(() => {
    if (!visiblePostSlugs) {
      // No filter - use sorted posts if available, otherwise original posts
      const postsToUse = sortedPosts || posts;
      return postsToUse.map((_, i) => 
        new Vector3(i * 50 - (postsToUse.length - 1) * 25, -8.5, i * 40)
      );
    }
    
    // Filter applied - use sorted visible posts
    const postsToUse = sortedPosts || posts;
    const visiblePosts = postsToUse.filter(post => visiblePostSlugs.has(post.slug));
    if (visiblePosts.length === 0) return [];
    
    // Always place visible posts at the first N positions (0, 1, 2, ...)
    return visiblePosts.map((_, i) => 
      new Vector3(i * 50 - (posts.length - 1) * 25, -8.5, i * 40)
    );
  }, [posts, visiblePostSlugs, originalPositions, sortedPosts]);
  // Create a mapping of post slug to target position based on sorted order
  const postTargetPositions = useMemo(() => {
    const targetMap = new Map<string, Vector3>();
    const postsToUse = sortedPosts || posts;
    
    if (!visiblePostSlugs) {
      // No search filter - assign positions based on sorted order
      postsToUse.forEach((post, sortedIndex) => {
        if (sortedIndex < compactedPositions.length) {
          targetMap.set(post.slug, compactedPositions[sortedIndex]);
        }
      });
    } else {
      // Search filter active - map visible posts to compacted positions in sorted order
      const visibleSortedPosts = postsToUse.filter(post => visiblePostSlugs.has(post.slug));
      visibleSortedPosts.forEach((post, compactIndex) => {
        if (compactIndex < compactedPositions.length) {
          targetMap.set(post.slug, compactedPositions[compactIndex]);
        }
      });
      
      // Hidden posts go underwater at their original relative position
      postsToUse.forEach((post, originalIndex) => {
        if (!visiblePostSlugs.has(post.slug) && originalIndex < originalPositions.length) {
          targetMap.set(post.slug, originalPositions[originalIndex]);
        }
      });
    }
    
    return targetMap;
  }, [posts, originalPositions, compactedPositions, visiblePostSlugs, sortedPosts]);

  // Calculate offset positions for camera positioning (only visible posts)
  const offsetPositions = useMemo(() => {
    return compactedPositions
      .filter(p => p)
      .map((p) => p.clone().add(new Vector3(-100, 30, 100)));
  }, [compactedPositions]);
  const startPos = useMemo(
    () => {
      // Provide default position when no posts are available
      if (offsetPositions.length === 0) {
        return new Vector3(-200, 30, 400);
      }
      return offsetPositions[0].clone().add(new Vector3(-100, 0, 300));
    },
    [offsetPositions]
  );

  // Track when scene is fully loaded
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [postBoxesLoaded, setPostBoxesLoaded] = useState(0);
  
  // Shared map of all post positions for collision detection
  const allPostPositions = useMemo(() => new Map<number, Vector3>(), []);
  
  // Memory optimization
  const performanceMode = useMemo(() => {
    // Detect device capabilities for adaptive quality
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    return {
      isLowEnd: deviceMemory < 4 || hardwareConcurrency < 4,
      textureQuality: deviceMemory < 4 ? 'low' : deviceMemory < 8 ? 'medium' : 'high',
      particleCount: deviceMemory < 4 ? 50 : 100,
      enableBloom: deviceMemory >= 4
    };
  }, []);
  
  // Call onLoaded when everything is ready
  useEffect(() => {
    if (sceneLoaded && postBoxesLoaded >= posts.length && onLoaded) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        onLoaded();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sceneLoaded, postBoxesLoaded, posts.length, onLoaded]);
  
  // Renderer config with aggressive memory optimization
  const handleCreated = ({ gl }: { gl: WebGLRenderer }) => {
    gl.toneMapping = NO_TONE_MAPPING;
    gl.outputEncoding = LINEAR_ENCODING;
    gl.setClearColor(0x000000, 0);
    
    // Configure renderer for maximum memory efficiency
    gl.setPixelRatio(Math.min(window.devicePixelRatio, performanceMode.isLowEnd ? 1 : 1.5));
    
    // Aggressive memory optimization settings
    gl.capabilities.maxTextures = Math.min(gl.capabilities.maxTextures, performanceMode.isLowEnd ? 4 : 8);
    gl.capabilities.maxVertexTextures = Math.min(gl.capabilities.maxVertexTextures, 2);
    gl.capabilities.maxTextureSize = Math.min(gl.capabilities.maxTextureSize, performanceMode.isLowEnd ? 1024 : 2048);
    
    // Additional WebGL optimizations for memory
    gl.debug.checkShaderErrors = false; // Disable in production
    gl.shadowMap.enabled = false; // Disable shadows completely
    gl.shadowMap.autoUpdate = false;
    
    // Note: antialias and powerPreference are set during canvas creation, not on renderer
    
    // Renderer state optimization
    gl.sortObjects = true; // Enable object sorting for better batching
    gl.autoClear = true;
    gl.autoClearColor = true;
    gl.autoClearDepth = true;
    gl.autoClearStencil = false; // Disable stencil clearing if not needed
    
    // Context loss handling for memory recovery
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('🔄 WebGL context lost, pausing rendering');
      memoryProfiler.takeSnapshot('OceanCanvas', 'context-lost');
    };
    
    const handleContextRestored = () => {
      console.log('✅ WebGL context restored');
      memoryProfiler.takeSnapshot('OceanCanvas', 'context-restored');
    };
    
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    
    // Force garbage collection hints (Chrome DevTools only)
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      const gcInterval = setInterval(() => {
        const globalWindow = window as Window & { gc?: () => void };
        if (typeof globalWindow.gc === 'function') {
          globalWindow.gc();
        }
      }, 60000); // Every minute in development
      
      // Store interval for cleanup
      const extendedRenderer = gl as WebGLRenderer & { __gcInterval?: ReturnType<typeof setInterval> };
      extendedRenderer.__gcInterval = gcInterval;
    }
    
    // Set up memory monitoring
    memoryProfiler.setRenderer(gl);
    memoryProfiler.takeSnapshot('OceanCanvas', 'renderer-created');
    
    // Mark scene as loaded after a frame
    const frameId = requestAnimationFrame(() => {
      setSceneLoaded(true);
      memoryProfiler.takeSnapshot('OceanCanvas', 'scene-loaded');
    });
    
    // CRITICAL: Return cleanup function to cancel animation frame and event listeners
    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      
      // Clear development GC interval
      const extendedRenderer = gl as WebGLRenderer & { __gcInterval?: ReturnType<typeof setInterval> };
      if (extendedRenderer.__gcInterval) {
        clearInterval(extendedRenderer.__gcInterval);
      }
      
      memoryProfiler.takeSnapshot('OceanCanvas', 'cleanup');
    };
  };
  
  // Early return if resources aren't ready or posts is invalid
  if (
    !resources.textures.waterNormals ||
    !resources.textures.cloudBackground ||
    !resources.models.sphere ||
    !resources.models.rubiksCube ||
    !resources.fonts.gentilis ||
    !posts ||
    !Array.isArray(posts)
  ) {
    return null;
  }

  return (
    <Canvas
      linear
      frameloop={isPaused ? "never" : "always"}
      onCreated={handleCreated}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: sceneLoaded && postBoxesLoaded >= posts.length ? 1 : 0,
        /* No transition for instant response */
      }}
      camera={{ position: startPos.toArray(), fov: 73 }}
      shadows={false}
    >
      {/* Scene content */}
      <CloudBackground texture={resources.textures.cloudBackground!} />
      <OceanScene 
        waterNormals={resources.textures.waterNormals!} 
        performanceMode={performanceMode}
      />
      <PostNavigation
        offset={[27, -8, 0]}
        onLeftClick={() => console.log("Left click")}
        onRightClick={() => console.log("Right click")}
        sphereModel={resources.models.sphere!}
        font={resources.fonts.gentilis!}
      />
      {posts.map((post, i) => {
        const originalPos = originalPositions[i];
        const targetPos = postTargetPositions.get(post.slug);
        
        // Safety check: ensure positions exist
        if (!originalPos || !targetPos) return null;
        
        // Determine if this post should be visible
        const isVisible = !visiblePostSlugs || visiblePostSlugs.has(post.slug);
        
        return (
          <PostCube
            key={post.slug}
            index={i}
            title={post.title}
            position={[originalPos.x, originalPos.y, originalPos.z]}
            targetPosition={[targetPos.x, targetPos.y, targetPos.z]}
            onClick={() => onPostClick?.(post.slug)}
            rubiksCubeModel={resources.models.rubiksCube!}
            font={resources.fonts.gentilis!}
            onReady={() => setPostBoxesLoaded(prev => prev + 1)}
            isVisible={isVisible}
            allPostPositions={allPostPositions}
            sortingActive={isSorting}
          />
        );
      })}
      <OceanCamera
        positions={offsetPositions}
        lerpFactor={0.08}
        stepSize={1}
      />

      {/* Conditional bloom effect based on device capability */}
      {performanceMode.enableBloom && (
        <EffectComposer 
          enableNormalPass={false}
          multisampling={performanceMode.isLowEnd ? 0 : 2}
        >
          <Bloom
            luminanceThreshold={performanceMode.isLowEnd ? 0.3 : 0}
            luminanceSmoothing={performanceMode.isLowEnd ? 0.4 : 0.2}
            intensity={performanceMode.isLowEnd ? 0.5 : 0.8}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
};

export default OceanDemoCanvas;
