import React, { useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useLocation } from "react-router-dom";
import * as THREE from "three";
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
// import { GeometryPool, lodManager } from "../../engine/rendering";

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

// Tiled Water Tile Component
const WaterTile: React.FC<{
  position: [number, number, number];
  size: number;
  waterNormals: Texture;
  performanceMode: PerformanceMode;
  visible: boolean;
}> = ({ position, size, waterNormals, performanceMode, visible }) => {
  const { scene } = useThree();
  const waterRef = useRef<Water>(null!);

  const water = useMemo(() => {
    if (!visible) return null;

    const segments = performanceMode.isLowEnd ? 16 : 32;
    const textureSize = performanceMode.isLowEnd ? 256 : 512;

    // Create smaller tile geometry
    const geo = new PlaneGeometry(size, size, segments, segments);

    const waterTile = new Water(geo, {
      textureWidth: textureSize,
      textureHeight: textureSize,
      waterNormals,
      sunColor: 0x00000f,
      waterColor: 0x111111,
      distortionScale: performanceMode.isLowEnd ? 1.5 : 3.7,
      fog: Boolean(scene.fog),
    });

    // Material setup
    waterTile.material.transparent = true;
    waterTile.material.uniforms.alpha.value = 0.99;
    waterTile.material.opacity = 0.99;
    waterTile.material.uniforms.waterColor.value.set(0x00000f);
    waterTile.material.uniforms.distortionScale.value = 0.5;
    waterTile.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>;
         // Bioluminescent glow
         gl_FragColor.rgb += vec3(0.8, 0.8, 0.8) * pow(dot(gl_FragColor.rgb, vec3(1.0)), 2.0);
        `,
      );
    };

    waterTile.rotation.x = -Math.PI / 2;
    waterTile.position.set(position[0], position[1], position[2]);

    return waterTile;
  }, [visible, size, waterNormals, performanceMode, scene, position]);

  useEffect(() => {
    if (water) {
      scene.add(water);
      waterRef.current = water;

      return () => {
        scene.remove(water);
        water.geometry.dispose();
        water.material.dispose();
      };
    }
  }, [water, scene]);

  useFrame((_, delta) => {
    if (waterRef.current) {
      const mat = waterRef.current.material as ShaderMaterial & {
        uniforms: { time: { value: number } };
      };
      mat.uniforms.time.value += delta;
    }
  });

  return null;
};

// Tiled Ocean Scene with frustum culling
const OceanScene: React.FC<{
  waterNormals: Texture;
  performanceMode: PerformanceMode;
}> = ({ waterNormals, performanceMode }) => {
  const { scene, camera } = useThree();
  const [visibleTiles, setVisibleTiles] = useState<Set<string>>(new Set());

  // Create frustum for tile culling
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const cameraMatrix = useMemo(() => new THREE.Matrix4(), []);

  useEffect(() => {
    // Only set fog once
    scene.fog = new FogExp2(0x2a2a38, 0.0009);
  }, [scene]);

  // Generate tile grid based on camera position and posts
  const tileConfig = useMemo(() => {
    const tileSize = 1000; // Larger tiles, fewer of them
    const gridExtent = 1000; // Much smaller grid for better performance
    const tiles: Array<{
      id: string;
      position: [number, number, number];
      size: number;
    }> = [];

    // Create a grid of tiles
    for (let x = -gridExtent; x <= gridExtent; x += tileSize) {
      for (let z = -gridExtent; z <= gridExtent; z += tileSize) {
        tiles.push({
          id: `tile_${x}_${z}`,
          position: [x, -8.5, z], // Same Y level as posts
          size: tileSize,
        });
      }
    }

    return { tiles, tileSize };
  }, []);

  // Update visible tiles based on camera frustum (every few frames for performance)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Check frustum every ~10 frames for better performance
    if (Math.floor(t * 6) % 10 === 0) {
      cameraMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(cameraMatrix);

      const newVisibleTiles = new Set<string>();

      tileConfig.tiles.forEach((tile) => {
        // Create bounding box for tile
        const tileCenter = new THREE.Vector3(
          tile.position[0],
          tile.position[1],
          tile.position[2],
        );
        const boundingBox = new THREE.Box3().setFromCenterAndSize(
          tileCenter,
          new THREE.Vector3(tile.size, 10, tile.size), // 10 unit height for water
        );

        // Check if tile intersects camera frustum
        if (frustum.intersectsBox(boundingBox)) {
          newVisibleTiles.add(tile.id);
        }
      });

      // Update state only if tiles changed
      if (
        newVisibleTiles.size !== visibleTiles.size ||
        [...newVisibleTiles].some((id) => !visibleTiles.has(id))
      ) {
        setVisibleTiles(newVisibleTiles);

        // Debug log in development
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🌊 Water tiles visible: ${newVisibleTiles.size}/${tileConfig.tiles.length}`,
          );
        }
      }
    }
  });

  return (
    <>
      {tileConfig.tiles.map((tile) => (
        <WaterTile
          key={tile.id}
          position={tile.position}
          size={tile.size}
          waterNormals={waterNormals}
          performanceMode={performanceMode}
          visible={visibleTiles.has(tile.id)}
        />
      ))}
    </>
  );
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
    sphere?: import("three/examples/jsm/loaders/GLTFLoader").GLTF;
    rubiksCube?: import("three/examples/jsm/loaders/GLTFLoader").GLTF;
  };
  fonts: {
    gentilis?: import("three/examples/jsm/loaders/FontLoader").Font;
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
  const location = useLocation();
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 10;
  
  // Check if we're on the About route
  const isAboutRoute = location.pathname === '/about';

  // Calculate pagination info
  const totalPosts = visiblePostSlugs
    ? (sortedPosts || posts).filter((post) => visiblePostSlugs.has(post.slug))
        .length
    : (sortedPosts || posts).length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;

  // Pagination handlers
  const handleLeftClick = () => {
    console.log(
      "Left click - currentPage:",
      currentPage,
      "totalPages:",
      totalPages,
    );
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      console.log("Setting page to:", newPage);
      setCurrentPage(newPage);
    }
  };

  const handleRightClick = () => {
    console.log(
      "Right click - currentPage:",
      currentPage,
      "totalPages:",
      totalPages,
    );
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      console.log("Setting page to:", newPage);
      setCurrentPage(newPage);
    }
  };

  // Reset to page 1 when search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [visiblePostSlugs, sortedPosts]);

  // Original positions for all posts (used when no search filter)
  const originalPositions = useMemo(() => {
    if (!posts || !Array.isArray(posts) || posts.length === 0) return [];
    return posts
      .filter((post) => post) // Filter out any undefined posts
      .map(
        (_, i) => new Vector3(i * 50 - (posts.length - 1) * 25, -100, i * 40),
      );
  }, [posts]);

  // Compacted positions - use sorted posts for positioning with pagination
  const compactedPositions = useMemo(() => {
    const maxPostsPerPage = postsPerPage; // Always use 10 for consistent positioning

    if (!visiblePostSlugs) {
      // No filter - use sorted posts if available, otherwise original posts
      const postsToUse = sortedPosts || posts;
      const paginatedPosts = postsToUse.slice(startIndex, endIndex);
      return paginatedPosts.map(
        (_, i) =>
          new Vector3(i * 50 - (maxPostsPerPage - 1) * 25, -8.5, i * 40),
      );
    }

    // Filter applied - use sorted visible posts with pagination
    const postsToUse = sortedPosts || posts;
    const visiblePosts = postsToUse.filter((post) =>
      visiblePostSlugs.has(post.slug),
    );
    const paginatedPosts = visiblePosts.slice(startIndex, endIndex);
    if (paginatedPosts.length === 0) return [];

    // Always place visible posts at the first N positions (0, 1, 2, ...)
    return paginatedPosts.map(
      (_, i) => new Vector3(i * 50 - (maxPostsPerPage - 1) * 25, -8.5, i * 40),
    );
  }, [
    posts,
    visiblePostSlugs,
    originalPositions,
    sortedPosts,
    startIndex,
    endIndex,
    postsPerPage,
  ]);

  // Calculate offset positions for camera positioning (only visible posts)
  const offsetPositions = useMemo(() => {
    return compactedPositions
      .filter((p) => p)
      .map((p) => p.clone().add(new Vector3(-100, 20, 100)));
  }, [compactedPositions]);
  const startPos = useMemo(() => {
    // Provide default position when no posts are available
    if (offsetPositions.length === 0) {
      return new Vector3(-200, 20, 400);
    }
    return offsetPositions[0].clone().add(new Vector3(-100, 0, 300));
  }, [offsetPositions]);

  // Track when scene is fully loaded
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [postBoxesLoaded, setPostBoxesLoaded] = useState(0);

  // Shared map of all post positions for collision detection
  const allPostPositions = useMemo(() => new Map<number, Vector3>(), []);

  // Memory optimization
  const performanceMode = useMemo(() => {
    // Detect device capabilities for adaptive quality
    const deviceMemory =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    return {
      isLowEnd: deviceMemory < 6 || hardwareConcurrency < 6,
      textureQuality:
        deviceMemory < 4 ? "low" : deviceMemory < 8 ? "medium" : "high",
      particleCount: deviceMemory < 4 ? 25 : 50,
      enableBloom: deviceMemory >= 8 && hardwareConcurrency >= 6,
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
    gl.setPixelRatio(
      Math.min(window.devicePixelRatio, performanceMode.isLowEnd ? 0.8 : 1.2),
    );

    // Aggressive memory optimization settings
    gl.capabilities.maxTextures = Math.min(
      gl.capabilities.maxTextures,
      performanceMode.isLowEnd ? 4 : 8,
    );
    gl.capabilities.maxVertexTextures = Math.min(
      gl.capabilities.maxVertexTextures,
      2,
    );
    gl.capabilities.maxTextureSize = Math.min(
      gl.capabilities.maxTextureSize,
      performanceMode.isLowEnd ? 1024 : 2048,
    );

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
      console.warn("🔄 WebGL context lost, pausing rendering");
      memoryProfiler.takeSnapshot("OceanCanvas", "context-lost");
    };

    const handleContextRestored = () => {
      console.log("✅ WebGL context restored");
      memoryProfiler.takeSnapshot("OceanCanvas", "context-restored");
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    // Force garbage collection hints (Chrome DevTools only)
    if (process.env.NODE_ENV === "development" && "gc" in window) {
      const gcInterval = setInterval(() => {
        const globalWindow = window as Window & { gc?: () => void };
        if (typeof globalWindow.gc === "function") {
          globalWindow.gc();
        }
      }, 60000); // Every minute in development

      // Store interval for cleanup
      const extendedRenderer = gl as WebGLRenderer & {
        __gcInterval?: ReturnType<typeof setInterval>;
      };
      extendedRenderer.__gcInterval = gcInterval;
    }

    // Set up memory monitoring
    memoryProfiler.setRenderer(gl);
    memoryProfiler.takeSnapshot("OceanCanvas", "renderer-created");

    // Mark scene as loaded after a frame
    const frameId = requestAnimationFrame(() => {
      setSceneLoaded(true);
      memoryProfiler.takeSnapshot("OceanCanvas", "scene-loaded");
    });

    // CRITICAL: Return cleanup function to cancel animation frame and event listeners
    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);

      // Clear development GC interval
      const extendedRenderer = gl as WebGLRenderer & {
        __gcInterval?: ReturnType<typeof setInterval>;
      };
      if (extendedRenderer.__gcInterval) {
        clearInterval(extendedRenderer.__gcInterval);
      }

      memoryProfiler.takeSnapshot("OceanCanvas", "cleanup");
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
      {!isAboutRoute && (
        <PostNavigation
          offset={[30, -16, -30]}
          onLeftClick={handleLeftClick}
          onRightClick={handleRightClick}
          sphereModel={resources.models.sphere!}
          font={resources.fonts.gentilis!}
          currentPage={currentPage}
          totalPosts={totalPosts}
          showLeftArrow={currentPage > 1}
          showRightArrow={currentPage < totalPages}
        />
      )}
      {(() => {
        // Get posts for current page
        const postsToUse = sortedPosts || posts;
        let postsToRender;

        if (!visiblePostSlugs) {
          // No filter - use pagination
          postsToRender = postsToUse.slice(startIndex, endIndex);
        } else {
          // Filter applied - get visible posts then paginate
          const visiblePosts = postsToUse.filter((post) =>
            visiblePostSlugs.has(post.slug),
          );
          postsToRender = visiblePosts.slice(startIndex, endIndex);
        }

        return postsToRender.map((post, renderIndex) => {
          // Use renderIndex for positioning (0, 1, 2, etc.)
          const targetPos = compactedPositions[renderIndex];

          // Use consistent starting position based on renderIndex instead of original index
          // This ensures consistent lighting regardless of which post is in which position
          const startPos = new Vector3(
            renderIndex * 50 - (postsPerPage - 1) * 25,
            -100,
            renderIndex * 40,
          );

          // Safety check: ensure positions exist
          if (!targetPos) return null;

          return (
            <PostCube
              key={post.slug}
              index={renderIndex} // Use render index instead of original index
              title={post.title}
              position={[startPos.x, startPos.y, startPos.z]}
              targetPosition={[targetPos.x, targetPos.y, targetPos.z]}
              onClick={() => onPostClick?.(post.slug)}
              rubiksCubeModel={resources.models.rubiksCube!}
              font={resources.fonts.gentilis!}
              onReady={() => setPostBoxesLoaded((prev) => prev + 1)}
              isVisible={true} // Always visible since we're only rendering visible posts
              allPostPositions={allPostPositions}
              sortingActive={isSorting}
            />
          );
        });
      })()}

      {/* Fixed directional lighting for each render position (0-9) */}
      {Array.from({ length: 10 }, (_, renderIndex) => {
        const targetPos = [
          renderIndex * 50 - (postsPerPage - 1) * 25,
          -8.5,
          renderIndex * 40,
        ] as [number, number, number];
        const lightPos1: [number, number, number] = [
          targetPos[0] - 1000,
          targetPos[1] + 800,
          targetPos[2] + 300,
        ];
        const lightPos2: [number, number, number] = [
          targetPos[0] - 1000,
          targetPos[1] - 800,
          targetPos[2] + 300,
        ];

        return (
          <group key={`lights-${renderIndex}`}>
            <directionalLight
              position={lightPos1}
              intensity={1}
              color={0xffffff}
            />
            <directionalLight
              position={lightPos2}
              intensity={0.1}
              color={0x4488cc}
            />
          </group>
        );
      })}

      <OceanCamera positions={offsetPositions} lerpFactor={0.08} stepSize={1} />

      {performanceMode.enableBloom && (
        <EffectComposer>
          <Bloom
            intensity={0.1}
            kernelSize={3}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.025}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
};

export default OceanDemoCanvas;
