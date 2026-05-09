import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../shared/contexts/ThemeContext";
import { DARK_SCENE_THEME, LIGHT_SCENE_THEME } from "../../shared/theme/sceneColors";
import {
  Vector3,
  Matrix4,
  Box3,
  Frustum,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderer,
  FogExp2,
  Texture,
  MathUtils,
  ACESFilmicToneMapping,
} from "three";
import { Sky } from "three/examples/jsm/objects/Sky";
import { Water } from "three/examples/jsm/objects/Water";
import OceanCamera from "./OceanCamera";
import { PostCube, hoveredPost } from "../posts";
import { PostNavigation } from "../posts";
import type { Post } from "../../app/AppContent";
import { memoryProfiler } from "../../engine/memory";
import { performanceMonitor } from "../../engine";
import { usePagination } from "../../shared/contexts/SearchContext";

// TypeScript augmentation for outputEncoding
declare module "three" {
  interface WebGLRenderer {
    outputEncoding: number;
  }
}

const LINEAR_ENCODING = 3000;

function ThemeSync({ isDark }: { isDark: boolean }) {
  const { gl } = useThree();
  const colors = isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;
  useEffect(() => {
    gl.setClearColor(colors.clearColor, 1);
  }, [colors, gl]);
  return null;
}

function ThemeSky({ isDark }: { isDark: boolean }) {
  const { scene } = useThree();
  const skyRef = useRef<Sky | null>(null);
  const progressRef = useRef(isDark ? 0 : 1);
  const targetRef = useRef(isDark ? 0 : 1);
  const skyTimeRef = useRef(0);
  targetRef.current = isDark ? 0 : 1;

  useEffect(() => {
    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);
    skyRef.current = sky;
    return () => {
      scene.remove(sky);
      sky.geometry.dispose();
      sky.material.dispose();
      skyRef.current = null;
    };
  }, [scene]);

  useFrame((state, delta) => {
    const sky = skyRef.current;
    if (!sky) return;
    const safeDelta = Math.min(delta, 1 / 30);

    progressRef.current = MathUtils.lerp(progressRef.current, targetRef.current, 1 - Math.pow(0.005, safeDelta));
    skyTimeRef.current = (skyTimeRef.current + safeDelta) % 600;
    const t = progressRef.current;
    const dark = DARK_SCENE_THEME.sky;
    const light = LIGHT_SCENE_THEME.sky;
    const dc = DARK_SCENE_THEME.clouds;
    const lc = LIGHT_SCENE_THEME.clouds;

    const uniforms = sky.material.uniforms;
    uniforms['turbidity'].value = MathUtils.lerp(dark.turbidity, light.turbidity, t);
    uniforms['rayleigh'].value = MathUtils.lerp(dark.rayleigh, light.rayleigh, t);
    uniforms['mieCoefficient'].value = MathUtils.lerp(dark.mieCoefficient, light.mieCoefficient, t);
    uniforms['mieDirectionalG'].value = MathUtils.lerp(dark.mieDirectionalG, light.mieDirectionalG, t);
    uniforms['cloudScale'].value = MathUtils.lerp(dc.cloudScale, lc.cloudScale, t);
    uniforms['cloudCoverage'].value = MathUtils.lerp(dc.cloudCoverage, lc.cloudCoverage, t);
    uniforms['cloudDensity'].value = MathUtils.lerp(dc.cloudDensity, lc.cloudDensity, t);
    uniforms['cloudElevation'].value = MathUtils.lerp(dc.cloudElevation, lc.cloudElevation, t);
    uniforms['showSunDisc'].value = MathUtils.lerp(dark.showSunDisc, light.showSunDisc, t);
    uniforms['time'].value = skyTimeRef.current;
    state.gl.toneMappingExposure = MathUtils.lerp(dark.exposure, light.exposure, t);

    const elevation = MathUtils.lerp(dark.elevation, light.elevation, t);
    const phi = MathUtils.degToRad(90 - elevation);
    const theta = MathUtils.degToRad(MathUtils.lerp(dark.azimuth, light.azimuth, t));
    uniforms['sunPosition'].value.setFromSphericalCoords(1, phi, theta);
  });

  return null;
}

// Removed PerformanceMode - using consistent medium-high quality settings

// Geometry pool for water tiles - CRITICAL memory leak fix
const waterGeometryPool = new Map<string, PlaneGeometry>();
const MAX_GEOMETRY_POOL_SIZE = 4; // Only need a few geometries for different sizes

// Geometry pooling logic is now inlined in the component to avoid React compiler issues

// Global cleanup function for geometry pool
function cleanupWaterGeometryPool() {
  waterGeometryPool.forEach(geo => geo.dispose());
  waterGeometryPool.clear();
}

// Cleanup geometry pool on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupWaterGeometryPool);
  
  // Make cleanup function globally available for emergency cleanup
  (window as Window & { cleanupWaterGeometryPool?: () => void }).cleanupWaterGeometryPool = cleanupWaterGeometryPool;
}

// Basic Water Tile Component - no memo, no complex logic
function WaterTile(props: {
  position: [number, number, number];
  size: number;
  waterNormals: Texture;
  visible: boolean;
  isDark: boolean;
}) {
  const { position, size, waterNormals, visible, isDark } = props;
  const { scene, camera } = useThree();
  const waterRef = useRef<Water | null>(null);
  const colors = isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;

  useEffect(() => {
    if (!visible || !waterNormals) return;

    const textureSize = 512; // Match reference quality
    
    // Higher detail to match reference example quality
    const segments = 128; // Increased for smoother water surface
    const key = `${size}-${segments}`;
    
    let geo: PlaneGeometry;
    if (waterGeometryPool.has(key)) {
      geo = waterGeometryPool.get(key)!;
    } else {
      
      // Clean pool if getting too large
      if (waterGeometryPool.size >= MAX_GEOMETRY_POOL_SIZE) {
        const firstKey = waterGeometryPool.keys().next().value;
        if (firstKey) {
          const oldGeo = waterGeometryPool.get(firstKey);
          if (oldGeo) {
            oldGeo.dispose();
          }
          waterGeometryPool.delete(firstKey);
        }
      }
      
      // Create new pooled geometry
      geo = new PlaneGeometry(size, size, segments, segments);
      waterGeometryPool.set(key, geo);
    }

    const sceneColors = colors;

    const waterTile = new Water(geo, {
      textureWidth: textureSize,
      textureHeight: textureSize,
      waterNormals,
      sunColor: sceneColors.sunColor,
      waterColor: sceneColors.waterColor,
      distortionScale: isDark ? 9 : 5,
      fog: Boolean(scene.fog),
    });

    // Store reference to render target for cleanup
    const waterTileWithRenderTarget = waterTile as typeof waterTile & {
      renderTarget?: { dispose: () => void };
    };

    waterTile.material.transparent = false;
    waterTile.material.opacity = 1.0;
    if (waterTile.material.uniforms?.reflectivity) {
      waterTile.material.uniforms.reflectivity.value = 0.0;
    }
    if (waterTile.material.uniforms?.alpha) {
      waterTile.material.uniforms.alpha.value = 1.0;
    }
    if (waterTile.material.uniforms?.waterColor) {
      waterTile.material.uniforms.waterColor.value.set(sceneColors.waterColor);
    }
    if (waterTile.material.uniforms?.size) {
      waterTile.material.uniforms.size.value = 0.5;
    }
    waterTile.rotation.x = -Math.PI / 2;
    waterTile.position.set(position[0], position[1], position[2]);

    scene.add(waterTile);
    waterRef.current = waterTile;

    return () => {
      scene.remove(waterTile);
      if (waterRef.current) {
        try {
          // Properly dispose of water material and associated resources
          if (waterTile.material) {
            const material = waterTile.material as ShaderMaterial & {
              uniforms?: { [key: string]: { value: unknown } };
            };
            
            // Dispose of any textures in uniforms
            if (material.uniforms) {
              Object.values(material.uniforms).forEach(uniform => {
                if (uniform.value?.dispose) {
                  uniform.value.dispose();
                }
              });
            }
            
            material.dispose();
          }
          
          // Dispose the water object itself if it has a dispose method
          (waterTile as { dispose?: () => void }).dispose?.();
          
          // Clear any render targets or framebuffers - dispose in correct order
          if (waterTileWithRenderTarget.renderTarget) {
            waterTileWithRenderTarget.renderTarget.dispose();
            waterTileWithRenderTarget.renderTarget = undefined;
          }
        } catch (error) {
          console.warn("Error during water tile cleanup:", error);
        }
        waterRef.current = null;
      }
    };
  }, [visible, size, waterNormals, scene, position, camera, isDark]);

  // Update water colors reactively when theme changes without recreating the tile
  useEffect(() => {
    if (!waterRef.current?.material?.uniforms) return;
    const uniforms = waterRef.current.material.uniforms;
    const sceneColors = colors;
    if (uniforms.waterColor) uniforms.waterColor.value.set(sceneColors.waterColor);
    if (uniforms.sunColor) uniforms.sunColor.value.set(sceneColors.sunColor);
  }, [isDark]);

  useFrame((_, delta) => {
    if (waterRef.current && visible) {
      const mat = waterRef.current.material as ShaderMaterial & {
        uniforms: { time: { value: number } };
      };
      // Prevent time value from growing indefinitely - reset every ~10 minutes to prevent precision issues
      mat.uniforms.time.value = (mat.uniforms.time.value + delta) % 600;
    }
  });

  return null;
}

WaterTile.displayName = 'WaterTile';

// Tiled Ocean Scene with frustum culling
const OceanScene: React.FC<{
  waterNormals: Texture;
  isDark: boolean;
}> = ({ waterNormals, isDark }) => {
  const { scene, camera } = useThree();
  const [visibleTiles, setVisibleTiles] = useState<Set<string>>(new Set());
  const lastGlobalCleanup = useRef<number>(Date.now());
  const colors = isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;

  // Create frustum for tile culling
  const frustum = useMemo(() => new Frustum(), []);
  const cameraMatrix = useMemo(() => new Matrix4(), []);

  useEffect(() => {
    const currentScene = scene;
    const fogColor = colors.fogColor;
    const fogInstance = new FogExp2(fogColor, 0.0009);
    Object.assign(currentScene, { fog: fogInstance });
    return () => {
      if (currentScene && currentScene.fog) {
        Object.assign(currentScene, { fog: null });
      }
    };
  }, [scene, isDark]);

  // Generate single ocean tile like reference example
  const tileConfig = useMemo(() => {
    const tileSize = 10000; // Match reference example (10000x10000)
    const tiles: Array<{
      id: string;
      position: [number, number, number];
      size: number;
    }> = [];

    // Single centered tile like reference example
    tiles.push({
      id: 'ocean_tile_center',
      position: [0, -8.5, 0], // Centered at origin, same Y as posts
      size: tileSize,
    });

    return { tiles, tileSize };
  }, []);

  // Reusable objects to prevent garbage collection
  const reusableVector = useMemo(() => new Vector3(), []);
  const reusableBoundingBox = useMemo(() => new Box3(), []);
  const reusableSizeVector = useMemo(() => new Vector3(), []);

  // Update visible tiles based on camera frustum (reduced frequency for better performance)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // More frequent cleanup to prevent memory accumulation - every 2 minutes
    const now = Date.now();
    if (now - lastGlobalCleanup.current > 120000) {
      lastGlobalCleanup.current = now;

      // More aggressive geometry pool cleanup to prevent accumulation
      if (waterGeometryPool.size > 1) {
        const entries = Array.from(waterGeometryPool.entries());
        // Keep only the most recently used geometry
        entries.slice(0, -1).forEach(([key, geometry]) => {
          geometry.dispose();
          waterGeometryPool.delete(key);
        });
      }

      // Dispatch global water cleanup event
      window.dispatchEvent(
        new CustomEvent("water-cleanup-global", {
          detail: { type: "periodic", timestamp: now },
        }),
      );

      // Force garbage collection in development
      if (process.env.NODE_ENV === "development" && typeof window !== 'undefined') {
        const globalWindow = window as Window & { gc?: () => void };
        if (typeof globalWindow.gc === "function") {
          globalWindow.gc();
        }
      }
    }

    // Check frustum less frequently for better performance
    if (Math.floor(t * 3) % 60 === 0) { // Every 60 frames instead of 20
      cameraMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(cameraMatrix);

      const newVisibleTiles = new Set<string>();

      tileConfig.tiles.forEach((tile) => {
        // Reuse objects instead of creating new ones
        reusableVector.set(
          tile.position[0],
          tile.position[1],
          tile.position[2],
        );

        // Distance-based culling - don't render tiles too far away
        const distance = camera.position.distanceTo(reusableVector);
        const maxDistance = 5000; // Maximum distance for water tiles

        if (distance > maxDistance) {
          return; // Skip this tile if too far away
        }

        reusableSizeVector.set(tile.size, 10, tile.size); // 10 unit height for water
        reusableBoundingBox.setFromCenterAndSize(
          reusableVector,
          reusableSizeVector,
        );

        // Check if tile intersects camera frustum
        if (frustum.intersectsBox(reusableBoundingBox)) {
          newVisibleTiles.add(tile.id);
        }
      });

      // Update state only if tiles changed
      if (
        newVisibleTiles.size !== visibleTiles.size ||
        [...newVisibleTiles].some((id) => !visibleTiles.has(id))
      ) {
        setVisibleTiles(newVisibleTiles);

        // Removed debug logging for better performance
      }
    }
  });

  return (
    <>
      {tileConfig.tiles.map((tile) => {
        const isVisible = visibleTiles.has(tile.id);
        return (
          <WaterTile
            key={tile.id}
            position={tile.position}
            size={tile.size}
            waterNormals={waterNormals}
            visible={isVisible}
            isDark={isDark}
          />
        );
      })}
    </>
  );
};



interface ResourceCache {
  textures: {
    waterNormals?: Texture;
  };
  models: {
    sphere?: import("three/examples/jsm/loaders/GLTFLoader").GLTF;
    rubiksCube?: import("three/examples/jsm/loaders/GLTFLoader").GLTF;
  };
  fonts: {
    inter?: import("three/examples/jsm/loaders/FontLoader").Font;
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;
  // Memory leak debugging and cleanup
  useEffect(() => {
    return () => {
      // Clear all geometry pool entries - deferred to prevent hook errors during navigation
      setTimeout(() => {
        try {
          waterGeometryPool.forEach(geo => geo.dispose());
          waterGeometryPool.clear();
        } catch (error) {
          console.warn("Error during deferred geometry pool cleanup:", error);
        }
      }, 0);
      
      // Clear timeout references
      timeoutIds.current.forEach(id => clearTimeout(id));
      timeoutIds.current.clear();
      
      // Force memory report and GC
      if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
        setTimeout(() => {
          (window as unknown as { gc: () => void }).gc();
        }, 100);
      }
    };
  }, []);
  const location = useLocation();
  // Get pagination state from SearchContext
  const { currentPage, setCurrentPage } = usePagination();
  const postsPerPage = 10;
  const [scrollToIndex, setScrollToIndex] = useState<number | undefined>(
    undefined,
  );

  // Check if we're on the About route
  const isAboutRoute = location.pathname === "/about";

  const postsToUse = sortedPosts || posts;
  const visiblePosts = useMemo(() => {
    if (!visiblePostSlugs) return postsToUse;
    return postsToUse.filter((post) => visiblePostSlugs.has(post.slug));
  }, [postsToUse, visiblePostSlugs]);

  // Calculate pagination info
  const totalPosts = visiblePosts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const postsToRender = useMemo(
    () => visiblePosts.slice(startIndex, endIndex),
    [visiblePosts, startIndex, endIndex],
  );

  // Pagination handlers
  // Track timeouts for cleanup
  const timeoutIds = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const onPostClickRef = useRef(onPostClick);
  useEffect(() => {
    onPostClickRef.current = onPostClick;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && hoveredPost.slug) {
        onPostClickRef.current?.(hoveredPost.slug);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(id => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  const handleLeftClick = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      
      // Calculate the actual last index for the previous page
      const previousPageStartIndex = (newPage - 1) * postsPerPage;
      const previousPageEndIndex = Math.min(previousPageStartIndex + postsPerPage, totalPosts);
      const postsOnPreviousPage = previousPageEndIndex - previousPageStartIndex;
      const lastIndexOnPreviousPage = postsOnPreviousPage - 1; // Convert count to 0-based index
      
      // Delay the scroll setting to happen after pagination useEffect runs
      const timeoutId = setTimeout(() => {
        setScrollToIndex(lastIndexOnPreviousPage);
        timeoutIds.current.delete(timeoutId);
      }, 0);
      timeoutIds.current.add(timeoutId);
    }
  }, [currentPage, setCurrentPage, totalPosts]);

  const handleRightClick = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      
      // Delay the scroll setting to happen after pagination useEffect runs
      const timeoutId = setTimeout(() => {
        setScrollToIndex(0);
        timeoutIds.current.delete(timeoutId);
      }, 0);
      timeoutIds.current.add(timeoutId);
    }
  }, [currentPage, setCurrentPage, totalPages]);

  const handlePostCubeClick = useCallback((slug: string) => {
    onPostClick?.(slug);
  }, [onPostClick]);

  // Reset scroll target after scrolling
  useEffect(() => {
    if (scrollToIndex !== undefined) {
      const timer = setTimeout(() => {
        setScrollToIndex(undefined);
      }, 1000); // Clear after 1 second to allow smooth scroll
      return () => clearTimeout(timer);
    }
  }, [scrollToIndex]);

  // Compacted positions - use sorted posts for positioning with pagination
  const compactedPositions = useMemo(() => {
    const maxPostsPerPage = postsPerPage; // Always use 10 for consistent positioning

    if (!visiblePostSlugs) {
      // No filter - use sorted posts if available, otherwise original posts
      const paginatedPosts = postsToUse.slice(startIndex, endIndex);
      return paginatedPosts.map(
        (_, i) =>
          new Vector3(i * 50 - (maxPostsPerPage - 1) * 25, -8.5, i * 40),
      );
    }

    const paginatedPosts = visiblePosts.slice(startIndex, endIndex);
    if (paginatedPosts.length === 0) return [];

    // Always place visible posts at the first N positions (0, 1, 2, ...)
    return paginatedPosts.map(
      (_, i) => new Vector3(i * 50 - (maxPostsPerPage - 1) * 25, -8.5, i * 40),
    );
  }, [
    visiblePostSlugs,
    postsToUse,
    visiblePosts,
    startIndex,
    endIndex,
  ]);

  // Calculate offset positions for camera positioning - need ALL filtered posts for proper pagination
  const offsetPositions = useMemo(() => {
    let allFilteredPosts;
    
    if (!visiblePostSlugs) {
      // No filter - use all posts
      allFilteredPosts = postsToUse;
    } else {
      // Filter applied - get all visible posts (not just current page)
      allFilteredPosts = postsToUse.filter((post) => visiblePostSlugs.has(post.slug));
    }
    
    // MEMORY OPTIMIZATION: Instead of creating positions for ALL posts, only create
    // enough positions for pagination (max 3 pages worth to prevent massive arrays)
    const maxPositions = Math.min(allFilteredPosts.length, postsPerPage);
    
    const positions = [];
    for (let index = 0; index < maxPositions; index++) {
      const pageIndex = index % postsPerPage; // Position within the page (0-9)
      const x = pageIndex * 50 - (postsPerPage - 1) * 25;
      const y = -8.5 + 20; // Post height + camera offset
      const z = pageIndex * 40 + 100; // Post depth + camera offset
      positions.push(new Vector3(x - 100, y, z));
    }
    
    return positions;
  }, [postsToUse, visiblePostSlugs, postsPerPage]);
  const startPos = useMemo(() => {
    // Provide default position when no posts are available
    if (offsetPositions.length === 0) {
      return new Vector3(-1200, 0, 1300);
    }
    return offsetPositions[0].clone().add(new Vector3(-1200, 0, 1300));
  }, [offsetPositions]);

  // Calculate max position index for current page
  const maxPositionIndex = useMemo(() => {
    // Return max index (count - 1) for current page
    return Math.max(0, postsToRender.length - 1);
  }, [postsToRender]);

  // Reset camera position when currentPage changes (handles both pagination and filter changes)
  useEffect(() => {
    // Calculate the first post index for the current page
    const firstPostIndex = (currentPage - 1) * postsPerPage;
    
    // Ensure scrollToIndex doesn't exceed available camera positions
    // offsetPositions is limited to prevent memory issues, so clamp to available range
    const maxAvailableIndex = Math.max(0, offsetPositions.length - 1);
    const clampedScrollToIndex = Math.min(firstPostIndex, maxAvailableIndex);
    
    setScrollToIndex(clampedScrollToIndex);
  }, [currentPage, postsPerPage, offsetPositions.length]);

  // Track when scene is fully loaded
  const [sceneLoaded, setSceneLoaded] = useState(false);

  // Call onLoaded when scene is ready - don't wait for all posts
  useEffect(() => {
    if (sceneLoaded && onLoaded) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        onLoaded();
      }, 500); // Slightly longer delay to ensure water tiles are rendered
      return () => clearTimeout(timer);
    }
  }, [sceneLoaded, onLoaded]);

  // Track initialization state with useRef to avoid React compiler issues
  const hasBeenInitializedRef = useRef(false);

  // Renderer config with aggressive memory optimization - memoized to prevent re-execution
  const handleCreated = useMemo(() => {
    return ({ gl }: { gl: WebGLRenderer }) => {
      // Prevent multiple initialization
      if (hasBeenInitializedRef.current) {
        return;
      }
      hasBeenInitializedRef.current = true;

      // Get canvas reference for event listeners
      const canvas = gl.domElement;

      gl.toneMapping = ACESFilmicToneMapping;
      gl.toneMappingExposure = colors.sky.exposure;
      gl.outputEncoding = LINEAR_ENCODING;
      gl.setClearColor(colors.clearColor, 1);

      // Consistent medium-high quality renderer settings
      gl.setPixelRatio(
        Math.min(window.devicePixelRatio, 1.5), // Higher pixel ratio for better quality
      );

      // Performance-focused settings - aggressive limits
      gl.capabilities.maxTextures = Math.min(
        gl.capabilities.maxTextures,
        8, // Reduced texture count
      );
      gl.capabilities.maxVertexTextures = Math.min(
        gl.capabilities.maxVertexTextures,
        2, // Reduced vertex textures
      );
      gl.capabilities.maxTextureSize = Math.min(
        gl.capabilities.maxTextureSize,
        1024, // Lower texture resolution
      );

      // Additional WebGL optimizations for memory
      gl.debug.checkShaderErrors = false; // Disable in production
      gl.shadowMap.enabled = false; // Disable shadows completely
      gl.shadowMap.autoUpdate = false;

      // Renderer state optimization
      gl.sortObjects = true; // Enable object sorting for better batching
      gl.autoClear = true;
      gl.autoClearColor = true;
      gl.autoClearDepth = true;
      gl.autoClearStencil = false; // Disable stencil clearing if not needed

      // Context loss handling for memory recovery
      const handleContextLost = (event: Event) => {
        event.preventDefault();
        // Reduced memory profiler calls - only for critical events
        if (process.env.NODE_ENV === "development") {
          memoryProfiler.takeSnapshot("OceanCanvas", "context-lost");
        }
      };

      const handleContextRestored = () => {
        if (process.env.NODE_ENV === "development") {
          memoryProfiler.takeSnapshot("OceanCanvas", "context-restored");
        }
      };

      canvas.addEventListener("webglcontextlost", handleContextLost);
      canvas.addEventListener("webglcontextrestored", handleContextRestored);

      // Force garbage collection hints (Chrome DevTools only) - standard frequency
      let gcInterval: ReturnType<typeof setInterval> | undefined;
      if (process.env.NODE_ENV === "development" && "gc" in window) {
        gcInterval = setInterval(() => {
          const globalWindow = window as Window & { gc?: () => void };
          if (typeof globalWindow.gc === "function") {
            globalWindow.gc();
          }
        }, 60000); // Every 1 minute - standard frequency
      }

      // Set up memory monitoring - only once
      memoryProfiler.setRenderer(gl);
      if (process.env.NODE_ENV === "development") {
        memoryProfiler.takeSnapshot("OceanCanvas", "renderer-created");
      }

      // Set up performance monitoring
      performanceMonitor.setRenderer(gl);
      performanceMonitor.enable(process.env.NODE_ENV === "development");

      // Mark scene as loaded after a frame
      let frameId: number;
      const scheduleSceneLoaded = () => {
        frameId = requestAnimationFrame(() => {
          setSceneLoaded(true);
          if (process.env.NODE_ENV === "development") {
            memoryProfiler.takeSnapshot("OceanCanvas", "scene-loaded");
          }
        });
      };
      scheduleSceneLoaded();

      // CRITICAL: Return cleanup function to cancel animation frame and event listeners
      return () => {
        cancelAnimationFrame(frameId);
        canvas.removeEventListener("webglcontextlost", handleContextLost);
        canvas.removeEventListener(
          "webglcontextrestored",
          handleContextRestored,
        );

        // Clear development GC interval
        if (gcInterval) {
          clearInterval(gcInterval);
        }

        // Only take cleanup snapshot in development
        if (process.env.NODE_ENV === "development") {
          memoryProfiler.takeSnapshot("OceanCanvas", "cleanup");
        }
      };
    };
  }, [colors.clearColor, colors.sky.exposure]);

  // Early return if resources aren't ready or posts is invalid
  if (
    !resources.textures.waterNormals ||
    !resources.models.sphere ||
    !resources.models.rubiksCube ||
    !resources.fonts.inter ||
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
        opacity: sceneLoaded ? 1 : 0,
        /* No transition for instant response */
      }}
      camera={{ position: startPos.toArray(), fov: 73 }}
      shadows={false}
    >
      {/* Scene content */}
      <OceanCamera
        positions={offsetPositions}
        lerpFactor={0.08}
        stepSize={1}
        scrollToIndex={scrollToIndex}
        maxPositionIndex={maxPositionIndex}
      />
      <ThemeSync isDark={isDark} />
      <ThemeSky isDark={isDark} />
      <ambientLight intensity={0.5} color={colors.ambientLightColor} />
      <fog attach="fog" args={[colors.fogColor, 1000, 8000]} />
      <OceanScene
        waterNormals={resources.textures.waterNormals!}
        isDark={isDark}
      />
      {!isAboutRoute && (
        <PostNavigation
          offset={[30, -16, -30]}
          onLeftClick={handleLeftClick}
          onRightClick={handleRightClick}
          sphereModel={resources.models.sphere!}
          font={resources.fonts.inter!}
          currentPage={currentPage}
          totalPosts={totalPosts}
          showLeftArrow={currentPage > 1}
          showRightArrow={currentPage < totalPages}
          isDark={isDark}
        />
      )}
      {postsToRender.map((post, renderIndex) => {
          // Use renderIndex for positioning (0, 1, 2, etc.)
          const targetPos = compactedPositions[renderIndex];

          // Use consistent starting position based on renderIndex instead of original index
          // This ensures consistent lighting regardless of which post is in which position
          const startPosX = renderIndex * 55 - (postsPerPage - 1) * 25;
          const startPosY = -1000;
          const startPosZ = renderIndex * 40;

          // Safety check: ensure positions exist
          if (!targetPos) return null;

          return (
            <PostCube
              key={post.slug}
              slug={post.slug}
              index={renderIndex}
              title={post.title}
              position={[startPosX, startPosY, startPosZ]}
              targetPosition={[targetPos.x, targetPos.y, targetPos.z]}
              onClick={handlePostCubeClick}
              rubiksCubeModel={resources.models.rubiksCube!}
              font={resources.fonts.inter!}
              isVisible={true}
              sortingActive={isSorting}
              isDark={isDark}
            />
          );
        })}

      {!isAboutRoute && (
        <group>
          <directionalLight
            position={[-1000, 1000, 800]}
            intensity={colors.mainLightIntensity}
            color={0xccccff}
          />
          <directionalLight
            position={[-500, 600, -20]}
            intensity={colors.fillLightIntensity}
            color={colors.sceneLightColor}
          />
          <directionalLight
            position={[1000, -900, 900]}
            intensity={colors.frontLightIntensity}
            color={colors.sceneLightColor}
          />
          <directionalLight
            position={[99, 900, -900]}
            intensity={colors.rimLightIntensity}
            color={colors.sceneLightColor}
          />
          <ambientLight intensity={colors.ambientSceneIntensity} color={colors.sceneLightColor} />
          <hemisphereLight
            color={0xaaafff}
            groundColor={colors.sceneGroundColor}
            intensity={colors.hemisphereLightIntensity}
            position={[0, 900, 0]}
          />
        </group>
      )}

    </Canvas>
  );
};

export default OceanDemoCanvas;
