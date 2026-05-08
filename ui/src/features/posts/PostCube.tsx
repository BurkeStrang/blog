import React, { useRef, useMemo, useEffect, useState, memo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import type { Font } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { MathUtils } from "three";
import { materialManager } from "../../engine";
import { triggerMobileHapticFeedback } from "../../services/haptics";
import { getSceneTheme } from "../../shared/theme/sceneColors";

// --- 1. Optimized text measurement with caching ---
const textWidthCache = new Map<string, number>();
const textGeometryCache = new Map<string, TextGeometry>();
const MAX_CACHE_SIZE = 30; // Further reduced cache size to prevent memory growth
const MAX_GEOMETRY_CACHE_SIZE = 5; // Much more aggressive geometry cache limit - only 5 geometries

// Periodic cache cleanup to prevent memory accumulation
let cacheCleanupCounter = 0;
const CACHE_CLEANUP_INTERVAL = 10; // Much more aggressive cleanup - every 10 instead of 25

// Make geometry cache globally accessible for cleanup
if (typeof window !== 'undefined') {
  (window as Window & { textGeometryCache?: Map<string, TextGeometry> }).textGeometryCache = textGeometryCache;
}

// --- 2. Text line wrapping optimized: avoid geometry creation entirely ---
function measureTextWidth(line: string, font: Font, size: number): number {
  "use no memo";
  const cacheKey = `${line}-${size}`;
  if (textWidthCache.has(cacheKey)) {
    return textWidthCache.get(cacheKey)!;
  }

  // Calculate width from font shapes without creating geometry
  const shapes = font.generateShapes(line, size);
  let width = 0;

  // Calculate bounding box directly from shapes to avoid geometry creation
  let minX = Infinity;
  let maxX = -Infinity;

  for (const shape of shapes) {
    const points = shape.getPoints();
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
    }
  }

  width = maxX - minX;

  // Fallback if no valid shapes
  if (!isFinite(width) || width <= 0) {
    width = line.length * size * 0.6; // Rough estimate
  }

  // Periodic cache cleanup to prevent memory accumulation
  cacheCleanupCounter++;
  if (cacheCleanupCounter >= CACHE_CLEANUP_INTERVAL) {
    textWidthCache.clear();
    cacheCleanupCounter = 0;
  } else if (textWidthCache.size >= MAX_CACHE_SIZE) {
    const firstKey = textWidthCache.keys().next().value;
    if (firstKey) {
      textWidthCache.delete(firstKey);
    }
  }

  textWidthCache.set(cacheKey, width);
  return width;
}

function wrapLines(
  text: string,
  font: Font,
  size: number,
  maxWidth: number,
): string[] {
  "use no memo";
  const words = text.split(" ");
  const lines: string[] = [];
  let current = words[0] ?? "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${current} ${word}`;
    const width = measureTextWidth(testLine, font, size);
    if (width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Shared mutable object — written by useFrame (synchronous), read by keydown handler
export const hoveredPost = { slug: null as string | null, isAuto: false };

// --- 3. Actual PostBox component ---
interface PostBoxProps {
  title: string;
  slug: string;
  index: number;
  position: [number, number, number]; // Original/base position
  onClick: (slug: string) => void;
  rubiksCubeModel: GLTF;
  font: Font;
  onReady?: () => void;
  isVisible?: boolean; // New prop for search filtering
  targetPosition?: [number, number, number]; // Target position for compacting
  sortingActive?: boolean; // New prop to indicate sorting is happening
  isDark?: boolean;
}

const fontSize = 0.2;
const wordScale = 13;
const textMargin = 0.8;
const textWrapWidthRatio = 0.76;
const textBoldOffset = 0.18;

const postTitleTextColor = {
  dark: 0x9ca3aa,
  light: 0x707070,
};

function PostBoxCore(props: PostBoxProps) {
  const {
    title,
    slug,
    index,
    position,
    onClick,
    rubiksCubeModel,
    font,
    onReady,
    isVisible = true,
    targetPosition,
    sortingActive = false,
    isDark = true,
  } = props;
  const { gl } = useThree();
  const colors = getSceneTheme(isDark);
  const displayTitle = useMemo(() => title.toUpperCase(), [title]);

  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [sortingPhase, setSortingPhase] = useState<
    "none" | "underwater" | "surfacing"
  >("none");
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const manualHoverRef = useRef(false); // Track if user is hovering with mouse
  const autoHoverEnabledRef = useRef(false); // Track if auto-hover is enabled (after initial delay)
  const toCameraRef = useRef(new THREE.Vector3());
  const hoverAnchorRef = useRef(new THREE.Vector3());
  const manualHoverOffsetRef = useRef(new THREE.Vector3());
  const manualHoverOffsetReadyRef = useRef(false);
  const manualHoverAmountRef = useRef(0);

  // Enable auto-hover after 1 second delay on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      autoHoverEnabledRef.current = true;
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);


  // Track sorting state changes - fix timeout cleanup
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (sortingActive && sortingPhase === "none") {
      // Start sorting sequence by going underwater
      setSortingPhase("underwater");
    } else if (!sortingActive && sortingPhase === "underwater") {
      // Sorting finished, start surfacing
      const delay = index * 100; // Stagger surfacing animation
      timer = setTimeout(() => {
        setSortingPhase("surfacing");
      }, delay);
      timeoutRefs.current.add(timer);
    } else if (!sortingActive && sortingPhase === "surfacing") {
      // Complete the surfacing animation
      timer = setTimeout(() => {
        setSortingPhase("none");
      }, 800); // Allow time for surfacing animation
      timeoutRefs.current.add(timer);
    }

    // Cleanup function at useEffect level
    return () => {
      if (timer) {
        clearTimeout(timer);
        timeoutRefs.current.delete(timer);
      }
    };
  }, [sortingActive, sortingPhase, index]);

  // --- Block geometry/bounds ---
  const blockScene = useMemo(
    () => rubiksCubeModel.scenes[0].clone(true),
    [rubiksCubeModel],
  );

  // Enhance materials for better lighting and reflections
  useEffect(() => {
    blockScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const material = mat as THREE.MeshStandardMaterial;
              material.color.setHex(colors.cubeBodyColor);
              material.metalness = colors.cubeMetalness;
              material.roughness = colors.cubeRoughness;
              material.envMapIntensity = colors.cubeEnvMapIntensity;
              material.needsUpdate = true;
            }
          });
        }
      }
    });
  }, [blockScene, isDark]);

  const bbox = useMemo(
    () => new THREE.Box3().setFromObject(blockScene),
    [blockScene],
  );
  const frontWidth = bbox.max.x - bbox.min.x;
  const frontHeight = bbox.max.y - bbox.min.y;
  const frontCenterX = bbox.min.x + frontWidth / 2;
  const frontCenterY = bbox.min.y + frontHeight / 2;
  const textWrapWidth = frontWidth * textWrapWidthRatio;

  // --- Efficient line wrapping ---
  const lines = useMemo(
    () => wrapLines(displayTitle, font, fontSize, textWrapWidth),
    [displayTitle, font, textWrapWidth],
  );

  // --- Create all text geometries ONCE with caching ---
  const textGeometries = useMemo(() => {
    // Create geometries only when the actual text lines change
    return lines.map((line) => {
      const cacheKey = `${line}-${fontSize}`;
      
      // Check cache first
      if (textGeometryCache.has(cacheKey)) {
        return textGeometryCache.get(cacheKey)!;
      }

      // Create new geometry
      const geo = new TextGeometry(line, {
        font,
        size: fontSize,
        bevelEnabled: false, // Disable bevel for better performance
        bevelSize: 0,
        bevelThickness: 0,
        bevelSegments: 0,
      });
      geo.computeBoundingBox();
      geo.center();

      // Cache the geometry with more aggressive cleanup
      if (textGeometryCache.size >= MAX_GEOMETRY_CACHE_SIZE) {
        // Clear half the cache when full to prevent frequent disposal
        const keysToDelete = Array.from(textGeometryCache.keys()).slice(0, Math.floor(MAX_GEOMETRY_CACHE_SIZE / 2));
        keysToDelete.forEach(key => {
          const oldGeo = textGeometryCache.get(key);
          if (oldGeo) {
            oldGeo.dispose();
          }
          textGeometryCache.delete(key);
        });
      }
      textGeometryCache.set(cacheKey, geo);
      return geo;
    });
  }, [lines, font, title]); // Added title back for cache key


  // --- Layout text lines ---
  const lineHeights = useMemo(
    () =>
      textGeometries.map(
        (g) => g.boundingBox!.max.y - g.boundingBox!.min.y || 0,
      ),
    [textGeometries],
  );
  const lineWidths = useMemo(
    () =>
      textGeometries.map(
        (g) => g.boundingBox!.max.x - g.boundingBox!.min.x || 0,
      ),
    [textGeometries],
  );
  const lineGap = 50 / wordScale;
  const totalTextHeight = useMemo(
    () =>
      lineHeights.reduce((sum, h) => sum + h, 0) +
      (lineHeights.length - 1) * lineGap,
    [lineHeights, lineGap],
  );
  const lineOffsets = useMemo(() => {
    const offs: number[] = [];
    let cursor = totalTextHeight / 2;
    for (const h of lineHeights) {
      offs.push(cursor - h / 2);
      cursor -= h + lineGap;
    }
    return offs;
  }, [lineHeights, totalTextHeight, lineGap]);

  // --- Backdrop (plane) geometry - using optimized geometry manager ---
  const backdropGeo = useMemo(() => {
    const width = frontWidth + 50 * textMargin;
    const height = frontHeight + 26 * textMargin;
    // Use geometry manager for better memory management
    const geo = new THREE.PlaneGeometry(width, height);
    return geo;
  }, [frontWidth, frontHeight]); // REMOVED title dependency that was causing recreation

  // --- Materials using optimized material manager for better performance ---
  const backdropMaterial = useMemo(() => {
    return materialManager.getMaterial({
      color: colors.cubeBackdropColor,
      transparent: true,
      opacity: colors.cubeBackdropOpacity,
      needsLighting: true,
      needsSpecular: false,
      needsNormalMap: false,
    });
  }, [isDark]);
  const neonMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: isDark ? postTitleTextColor.dark : postTitleTextColor.light,
      transparent: true,
      toneMapped: false,
    });
  }, [isDark]);
  // --- Signal ready when geometries are created ---
  useEffect(() => {
    if (textGeometries.length > 0) {
      const timer = setTimeout(() => onReady?.(), 50);
      return () => clearTimeout(timer);
    }
  }, [textGeometries, onReady]);

  useEffect(() => {
    return () => {
      // Only dispose backdrop geometry - text geometries managed by cache
      backdropGeo.dispose();

      // CRITICAL: Dispose cloned GLTF scene and all its resources completely
      blockScene.traverse((child) => {
        const meshChild = child as THREE.Mesh;
        
        // Dispose geometry
        if (meshChild.geometry) {
          meshChild.geometry.dispose();
        }
        
        // Dispose materials
        if (meshChild.material) {
          if (Array.isArray(meshChild.material)) {
            meshChild.material.forEach((mat) => {
              mat.dispose();
              // Also dispose textures if they exist (cast to material with texture properties)
              const matWithTextures = mat as { 
                map?: { dispose: () => void };
                normalMap?: { dispose: () => void };
                roughnessMap?: { dispose: () => void };
                metalnessMap?: { dispose: () => void };
                aoMap?: { dispose: () => void };
                emissiveMap?: { dispose: () => void };
              };
              if (matWithTextures.map) matWithTextures.map.dispose();
              if (matWithTextures.normalMap) matWithTextures.normalMap.dispose();
              if (matWithTextures.roughnessMap) matWithTextures.roughnessMap.dispose();
              if (matWithTextures.metalnessMap) matWithTextures.metalnessMap.dispose();
              if (matWithTextures.aoMap) matWithTextures.aoMap.dispose();
              if (matWithTextures.emissiveMap) matWithTextures.emissiveMap.dispose();
            });
          } else {
            meshChild.material.dispose();
            // Also dispose textures if they exist (cast to material with texture properties)
            const matWithTextures = meshChild.material as { 
              map?: { dispose: () => void };
              normalMap?: { dispose: () => void };
              roughnessMap?: { dispose: () => void };
              metalnessMap?: { dispose: () => void };
              aoMap?: { dispose: () => void };
              emissiveMap?: { dispose: () => void };
            };
            if (matWithTextures.map) matWithTextures.map.dispose();
            if (matWithTextures.normalMap) matWithTextures.normalMap.dispose();
            if (matWithTextures.roughnessMap) matWithTextures.roughnessMap.dispose();
            if (matWithTextures.metalnessMap) matWithTextures.metalnessMap.dispose();
            if (matWithTextures.aoMap) matWithTextures.aoMap.dispose();
            if (matWithTextures.emissiveMap) matWithTextures.emissiveMap.dispose();
          }
        }
      });

      // Clear the scene hierarchy completely
      blockScene.clear();

      // Reset cursor to auto on unmount
      document.body.style.cursor = "auto";

      // Force geometry cache cleanup if this was the last post
      if (textGeometryCache.size > MAX_GEOMETRY_CACHE_SIZE * 2) {
        textGeometryCache.forEach(geo => geo.dispose());
        textGeometryCache.clear();
      }
    };
  }, [backdropGeo, blockScene]);

  useEffect(() => {
    return () => { neonMat.dispose(); };
  }, [neonMat]);

  // --- Animation (frame loop) ---

  const underwaterDepth = -250; // How deep underwater hidden posts go
  const sortingDepth = -250; // Much deeper for sorting animation
  const liftEase = 0.1;
  const underwaterEase = 0.1; // Fast easing for going underwater
  const repositionEase = 0.1; // Slow easing for repositioning visible posts
  const hoverEase = 0.19;

  useFrame(({ clock, camera }) => {
    const g = groupRef.current;
    const t = clock.getElapsedTime();

    // Auto-hover when cube is in center of screen (only when not manually hovering)
    if (!manualHoverRef.current && autoHoverEnabledRef.current && isVisible && sortingPhase === "none") {
      // Get cube's world position
      const worldPos = new THREE.Vector3();
      g.getWorldPosition(worldPos);

      // Project to screen space (normalized device coordinates)
      const screenPos = worldPos.clone().project(camera);

      // Check if close to center (NDC: x=0, y=0 is center)
      // Use hysteresis to prevent oscillation: smaller threshold to enter, larger to exit
      const enterThreshold = 0.20; // Distance to start hovering
      const exitThreshold = 0.30; // Distance to stop hovering (larger to prevent oscillation)
      const distanceFromCenter = Math.sqrt(screenPos.x * screenPos.x + screenPos.y * screenPos.y) + 0.04;

      if (!hovered && distanceFromCenter < enterThreshold) {
        setHovered(true);
        hoveredPost.slug = slug;
        hoveredPost.isAuto = true;
      } else if (hovered && distanceFromCenter > exitThreshold) {
        setHovered(false);
        if (hoveredPost.slug === slug) {
          hoveredPost.slug = null;
          hoveredPost.isAuto = false;
        }
      }
    }

    // Only force out if another cube claimed hover AND this box isn't the centered one
    if (hovered && hoveredPost.slug !== null && hoveredPost.slug !== slug && !hoveredPost.isAuto) {
      setHovered(false);
    }

    // Determine which base position to use (target for spacing, original for underwater)
    const basePos = isVisible && targetPosition ? targetPosition : position;

    // Animate: bob, center-lift, or mouse toward-camera
    const bob = basePos[1] + Math.sin(t * 2) * 0.1;
    const indexOffset = Math.pow(index / 10, 4) * 0.9;
    const hoverLift = 11;

    // Calculate base target positions
    let baseTargetX = basePos[0] - 8 - indexOffset;
    let baseTargetY = bob;
    let baseTargetZ = basePos[2] + 8 + indexOffset;

    if (hovered) {
      // Center-of-screen hover: lift up (original behaviour)
      baseTargetX = (basePos[0] - hoverLift - indexOffset);
      baseTargetY = (basePos[1] + hoverLift);
      baseTargetZ = (basePos[2] + hoverLift + indexOffset);
    }

    manualHoverAmountRef.current = MathUtils.lerp(
      manualHoverAmountRef.current,
      manualHoverRef.current ? 1 : 0,
      0.18,
    );

    if (manualHoverRef.current && !manualHoverOffsetReadyRef.current) {
      // Latch the hover direction once. Recomputing it while the cube eases
      // toward the camera makes the path bend into a second direction.
      hoverAnchorRef.current.set(baseTargetX, baseTargetY + 28, baseTargetZ);
      toCameraRef.current
        .subVectors(camera.position, hoverAnchorRef.current)
        .normalize();
      const hoverDist = hovered ? 12 : 16;
      manualHoverOffsetRef.current.copy(toCameraRef.current).multiplyScalar(hoverDist);
      manualHoverOffsetReadyRef.current = true;
    }

    if (manualHoverAmountRef.current > 0.001) {
      baseTargetX += manualHoverOffsetRef.current.x * manualHoverAmountRef.current;
      baseTargetY += manualHoverOffsetRef.current.y * manualHoverAmountRef.current;
      baseTargetZ += manualHoverOffsetRef.current.z * manualHoverAmountRef.current;
    } else if (!manualHoverRef.current) {
      manualHoverAmountRef.current = 0;
      manualHoverOffsetReadyRef.current = false;
    }

    // Handle sorting animation phases
    if (sortingPhase === "underwater") {
      // Send deep underwater during sorting
      baseTargetY = sortingDepth;
      baseTargetZ = position[2]; // Use original Z position underwater
      baseTargetX = position[0]; // Use original X position underwater
    } else if (!isVisible && sortingPhase === "none") {
      // Send to regular depth when filtered out (not sorting)
      baseTargetY = underwaterDepth;
      baseTargetZ = position[2]; // Use original Z position underwater
      baseTargetX = position[0]; // Use original X position underwater
    } else if (sortingPhase === "surfacing") {
      // Coming up from underwater during sorting
      baseTargetY = basePos[1] + Math.sin(t * 2) * 0.1; // Surface to normal position
      baseTargetZ = basePos[2] + 8 + Math.pow(index / 10, 4) * 0.9;
      baseTargetX = basePos[0] - 8 - Math.pow(index / 10, 4) * 0.9;
    }

    const wiggleDelta = 0.02 + (Math.sin(index) + 0.1) * 0.15;
    const targetRotX = hovered ? 0 : -0.01 + Math.cos(t) * 0.01 + wiggleDelta;
    const targetRotY = hovered
      ? -0.8 - Math.pow(index / 10, 2) * 0.1
      : Math.sin(t) * 0.03 - 0.5 - wiggleDelta;
    const targetRotZ = hovered ? 0 : Math.sin(t) * 0.04 + wiggleDelta;

    // Set target position directly without collision detection
    const targetX = baseTargetX;
    const targetY = baseTargetY + 28;
    const targetZ = baseTargetZ;

    // Determine easing speed based on type of movement
    let currentEase = liftEase; // Default for normal hover/bob movements
    let yEase = liftEase; // Separate easing for Y position

    if (sortingPhase === "underwater") {
      // Fast movement for going deep underwater during sorting
      currentEase = underwaterEase;
      yEase = underwaterEase;
    } else if (!isVisible && sortingPhase === "none") {
      // Fast movement for going underwater when filtered out
      currentEase = underwaterEase;
      yEase = underwaterEase;
    } else if (sortingPhase === "surfacing") {
      // Medium speed for surfacing
      currentEase = 0.08;
      yEase = 0.08;
    } else if (
      targetPosition &&
      (Math.abs(basePos[0] - position[0]) > 0.1 ||
        Math.abs(basePos[2] - position[2]) > 0.1)
    ) {
      // Slow movement for repositioning visible posts that moved positions
      currentEase = hovered ? hoverEase : repositionEase;

      // Check if X and Z positions are close to target - if so, allow Y movement
      const xCloseToTarget = Math.abs(g.position.x - targetX) < 5;
      const zCloseToTarget = Math.abs(g.position.z - targetZ) < 5;

      if (xCloseToTarget && zCloseToTarget) {
        yEase = currentEase; // Normal Y movement when X/Z are in position
      } else {
        yEase = 0.02; // Very slow Y movement while X/Z are moving
      }
    }

    // Note: Removed allPostPositions tracking since collision detection is no longer needed

    // Move X and Z first with normal easing
    g.position.x = MathUtils.lerp(g.position.x, targetX, currentEase);
    g.position.z = MathUtils.lerp(g.position.z, targetZ, currentEase);

    // Move Y with potentially different easing (slower until X/Z are in position)
    g.position.y = MathUtils.lerp(g.position.y, targetY, yEase);
    g.rotation.x = MathUtils.lerp(g.rotation.x, targetRotX, liftEase);
    g.rotation.y = MathUtils.lerp(g.rotation.y, targetRotY, liftEase);
    g.rotation.z = MathUtils.lerp(g.rotation.z, targetRotZ, liftEase);

    // Periodic garbage collection to prevent memory accumulation in development
    if (process.env.NODE_ENV === "development" && Math.floor(t * 60) % 300 === 0) {
      if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
        (window as unknown as { gc: () => void }).gc();
      }
    }
  });

  // --- Pointer events ---
  const handlePointerOver = () => {
    if (!isVisible || sortingPhase !== "none") return;
    manualHoverRef.current = true;
    manualHoverOffsetReadyRef.current = false;
    // Don't steal slug from a centered (auto-hovered) box
    if (!hoveredPost.isAuto) hoveredPost.slug = slug;
    if (gl.domElement) gl.domElement.style.setProperty("cursor", "pointer");
  };
  const handlePointerOut = () => {
    manualHoverRef.current = false;
    // Only clear slug if we own it and it wasn't set by auto-hover
    if (hoveredPost.slug === slug && !hoveredPost.isAuto) hoveredPost.slug = null;
    if (gl.domElement) gl.domElement.style.setProperty("cursor", "auto");
  };

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!isVisible || sortingPhase !== "none") return;
    triggerMobileHapticFeedback();
    onClick(slug);
  };

  // Always render - frustum culling removed
  const shouldRender = true;

  // Removed debug logging for better performance

  // --- Render ---
  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {shouldRender && (
        <>
          {/* Model */}
          <primitive object={blockScene} scale={[16, 16, 16]} />

          {/* Backdrop */}
          <mesh
            geometry={backdropGeo}
            material={backdropMaterial}
            position={[
              frontCenterX + 4,
              frontCenterY,
              bbox.max.z + textMargin + 22,
            ]}
          />

          {/* Text lines - always render text geometry when in extended frustum for pre-loading */}
          {textGeometries.map((geo, i) => {
            const zBase = bbox.max.z + textMargin - 0.02 + 27;
            const leftEdgeX = frontCenterX + 2 - (textWrapWidth * wordScale) / 2;
            const textX = leftEdgeX + (lineWidths[i] * wordScale) / 2;
            const textY = frontCenterY + lineOffsets[i];
            return (
              <React.Fragment key={i}>
                <mesh
                  geometry={geo}
                  material={neonMat}
                  scale={[wordScale, wordScale, 0.01]}
                  position={[
                    textX - textBoldOffset,
                    textY,
                    zBase - 0.01,
                  ]}
                />
                <mesh
                  geometry={geo}
                  material={neonMat}
                  scale={[wordScale, wordScale, 0.01]}
                  position={[
                    textX,
                    textY,
                    zBase,
                  ]}
                />
              </React.Fragment>
            );
          })}
        </>
      )}
    </group>
  );
}

const PostBox: React.FC<PostBoxProps> = memo((props) => {
  return <PostBoxCore {...props} />;
});

PostBox.displayName = 'PostBox';

export default PostBox;
