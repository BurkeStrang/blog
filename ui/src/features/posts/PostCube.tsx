import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import type { Font } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { MathUtils } from "three";
import { MaterialPool } from "../../engine/memory";

// --- 1. Optimized text measurement with caching ---
const textWidthCache = new Map<string, number>();
const MAX_CACHE_SIZE = 100; // Limit cache size to prevent memory growth

// --- 2. Text line wrapping optimized: avoid geometry creation in loop ---
function measureTextWidth(line: string, font: Font, size: number): number {
  const cacheKey = `${line}-${size}`;
  if (textWidthCache.has(cacheKey)) {
    return textWidthCache.get(cacheKey)!;
  }
  
  // Uses the font data's "generateShapes" for cheap width estimate
  const shapes = font.generateShapes(line, size);
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.computeBoundingBox();
  const width = geometry.boundingBox
    ? geometry.boundingBox.max.x - geometry.boundingBox.min.x
    : 0;
  geometry.dispose();
  
  // Limit cache size to prevent memory growth
  if (textWidthCache.size >= MAX_CACHE_SIZE) {
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

// --- 3. Actual PostBox component ---
interface PostBoxProps {
  title: string;
  index: number;
  position: [number, number, number]; // Original/base position
  onClick: () => void;
  rubiksCubeModel: GLTF;
  font: Font;
  onReady?: () => void;
  isVisible?: boolean; // New prop for search filtering
  targetPosition?: [number, number, number]; // Target position for compacting
  allPostPositions?: Map<number, THREE.Vector3>; // All current post positions for collision detection
  sortingActive?: boolean; // New prop to indicate sorting is happening
}

const fontSize = 0.2;
const wordScale = 12;
const textMargin = 0.8;

function PostBoxCore(props: PostBoxProps) {
  const { title, index, position, onClick, rubiksCubeModel, font, onReady, isVisible = true, targetPosition, allPostPositions, sortingActive = false } = props;
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);
  const [sortingPhase, setSortingPhase] = useState<'none' | 'underwater' | 'surfacing'>('none');
  const [inFrustum, setInFrustum] = useState(true);
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  
  // Create frustum for culling checks
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const cameraMatrix = useMemo(() => new THREE.Matrix4(), []);
  
  // LOD (Level of Detail) state - removed for performance optimization
  // const [lodLevel, setLodLevel] = useState<'high' | 'medium' | 'low'>('high');
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);
  
  // Track sorting state changes
  useEffect(() => {
    if (sortingActive && sortingPhase === 'none') {
      // Start sorting sequence by going underwater
      setSortingPhase('underwater');
    } else if (!sortingActive && sortingPhase === 'underwater') {
      // Sorting finished, start surfacing
      const delay = index * 100; // Stagger surfacing animation
      const timer = setTimeout(() => {
        setSortingPhase('surfacing');
      }, delay);
      timeoutRefs.current.add(timer);
      return () => {
        clearTimeout(timer);
        timeoutRefs.current.delete(timer);
      };
    } else if (!sortingActive && sortingPhase === 'surfacing') {
      // Complete the surfacing animation
      const timer = setTimeout(() => {
        setSortingPhase('none');
      }, 800); // Allow time for surfacing animation
      timeoutRefs.current.add(timer);
      return () => {
        clearTimeout(timer);
        timeoutRefs.current.delete(timer);
      };
    }
  }, [sortingActive, sortingPhase, index]);

  // --- Block geometry/bounds ---
  const blockScene = useMemo(() => rubiksCubeModel.scenes[0].clone(true), [rubiksCubeModel]);
  const bbox = useMemo(
    () => new THREE.Box3().setFromObject(blockScene),
    [blockScene]
  );
  const frontWidth = bbox.max.x - bbox.min.x;
  const frontHeight = bbox.max.y - bbox.min.y;
  const frontCenterX = bbox.min.x + frontWidth / 2;
  const frontCenterY = bbox.min.y + frontHeight / 2;

  // --- Efficient line wrapping ---
  const lines = useMemo(
    () => wrapLines(title, font, fontSize, frontWidth),
    [title, font, frontWidth]
  );

  // --- Create all text geometries ONCE ---
  const textGeometries = useMemo(() => {
    return lines.map((line) => {
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
      return geo;
    });
  }, [lines, font]);

  // --- Dispose all resources on unmount and signal ready ---
  useEffect(() => {
    // Signal that this PostBox is ready after geometries are created
    if (textGeometries.length > 0) {
      const timer = setTimeout(() => onReady?.(), 50);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [textGeometries, onReady]);

  // --- Layout text lines ---
  const lineHeights = useMemo(
    () =>
      textGeometries.map(
        (g) => g.boundingBox!.max.y - g.boundingBox!.min.y || 0
      ),
    [textGeometries]
  );
  const lineGap = 50 / wordScale;
  const totalTextHeight = useMemo(
    () =>
      lineHeights.reduce((sum, h) => sum + h, 0) +
      (lineHeights.length - 1) * lineGap,
    [lineHeights, lineGap]
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

  // --- Backdrop (plane) geometry ---
  const backdropGeo = useMemo(
    () =>
      new THREE.PlaneGeometry(
        frontWidth + 50 * textMargin,
        frontHeight + 26 * textMargin
      ),
    [frontWidth, frontHeight]
  );

  // --- Materials using object pooling for memory efficiency ---
  const backdropMaterial = useMemo(
    () =>
      MaterialPool.getMaterial(
        'postbox-backdrop',
        () => new THREE.MeshStandardMaterial({
          color: 0x000000,
          opacity: 0.8,
          transparent: true,
          side: THREE.DoubleSide,
        }),
        (mat) => {
          mat.color.setHex(0x000000);
          mat.opacity = 0.8;
        }
      ),
    []
  );
  const neonMat = useMemo(
    () =>
      MaterialPool.getMaterial(
        'postbox-neon',
        () => new THREE.MeshStandardMaterial({
          color: 0x006060,
          emissive: 0x00ffff,
          roughness: 1,
          metalness: 1,
          toneMapped: false,
          transparent: true,
        }),
        (mat) => {
          (mat as THREE.MeshStandardMaterial).color.setHex(0x006060);
          (mat as THREE.MeshStandardMaterial).emissive.setHex(0x00ffff);
        }
      ),
    []
  );
  const glowMat = useMemo(
    () =>
      MaterialPool.getMaterial(
        'postbox-glow',
        () => new THREE.MeshBasicMaterial({
          color: 0x000066,
          side: THREE.BackSide,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          depthWrite: true,
        }),
        (mat) => {
          (mat as THREE.MeshBasicMaterial).color.setHex(0x000066);
          mat.opacity = 1;
        }
      ),
    []
  );

  // --- Master cleanup effect for all disposable resources ---
  useEffect(() => {
    return () => {
      // Dispose all text geometries
      textGeometries.forEach((g) => g.dispose());
      // Dispose backdrop geometry
      backdropGeo.dispose();
      // Return materials to pool instead of disposing
      MaterialPool.releaseMaterial('postbox-backdrop', backdropMaterial);
      MaterialPool.releaseMaterial('postbox-neon', neonMat);
      MaterialPool.releaseMaterial('postbox-glow', glowMat);
      
      // CRITICAL: Dispose cloned GLTF scene and all its resources
      blockScene.traverse((child) => {
        const meshChild = child as THREE.Mesh;
        if (meshChild.geometry) {
          meshChild.geometry.dispose();
        }
        if (meshChild.material) {
          if (Array.isArray(meshChild.material)) {
            meshChild.material.forEach(mat => mat.dispose());
          } else {
            meshChild.material.dispose();
          }
        }
      });
      
      // Reset cursor to auto on unmount to prevent stuck cursor states
      document.body.style.cursor = "auto";
    };
  }, [textGeometries, backdropGeo, backdropMaterial, neonMat, glowMat, blockScene]);

  // --- Animation (frame loop) ---
  const hoverLift = 11;
  const underwaterDepth = -140; // How deep underwater hidden posts go
  const sortingDepth = -140; // Much deeper for sorting animation
  const liftEase = 0.1;
  const underwaterEase = 0.1; // Fast easing for going underwater
  const repositionEase = 0.1; // Slow easing for repositioning visible posts
  const hoverEase = 0.15;
  const collisionRadius = 1; // Minimum distance between cubes
  
  // Collision detection helper
  const checkCollisions = (targetPos: THREE.Vector3): THREE.Vector3 => {
    if (!allPostPositions) return targetPos;
    
    const adjustedPos = targetPos.clone();
    let hasCollision = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (hasCollision && attempts < maxAttempts) {
      hasCollision = false;
      
      // Check against all other posts
      for (const [otherIndex, otherPos] of allPostPositions) {
        if (otherIndex === index) continue; // Skip self
        
        const distance = adjustedPos.distanceTo(otherPos);
        if (distance < collisionRadius) {
          hasCollision = true;
          
          // Calculate repulsion vector
          const repulsion = adjustedPos.clone().sub(otherPos).normalize();
          if (repulsion.length() === 0) {
            // If positions are identical, create random offset
            repulsion.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
          }
          
          // Move away from collision
          const pushDistance = collisionRadius - distance + 2;
          adjustedPos.add(repulsion.multiplyScalar(pushDistance));
        }
      }
      attempts++;
    }
    
    return adjustedPos;
  };
  
  useFrame(({ clock }) => {
    const g = groupRef.current;
    const t = clock.getElapsedTime();
    
    // Frustum culling and LOD check - only do this every few frames for performance
    if (Math.floor(t * 6) % 6 === 0) { // Check every ~6 frames for better performance
      cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(cameraMatrix);
      
      // Create a bounding sphere around the post cube with extra margin for text pre-loading
      const worldPosition = g.position.clone();
      const boundingSphere = new THREE.Sphere(worldPosition, 1000); // 150 unit radius for early text rendering
      
      const isInFrustum = frustum.intersectsSphere(boundingSphere);
      setInFrustum(isInFrustum);
      
      // LOD calculation removed for performance optimization
      
      // Early exit if not in frustum and not visible (filtered out)
      if (!isInFrustum && !isVisible) {
        return;
      }
    }
    
    // Determine which base position to use (target for spacing, original for underwater)
    const basePos = isVisible && targetPosition ? targetPosition : position;
    
    // Animate: lerped hover lift, wiggle
    const bob = basePos[1] + Math.sin(t * 2) * 0.1;
    
    // Calculate base target positions using the determined base position
    let baseTargetY = hovered ? basePos[1] + hoverLift : bob;
    let baseTargetZ = hovered
      ? basePos[2] + 10 + Math.pow(index / 10, 4) * 0.9
      : basePos[2] + 8 + Math.pow(index / 10, 4) * 0.9;
    let baseTargetX = hovered
      ? basePos[0] - 10 - Math.pow(index / 10, 4) * 0.9
      : basePos[0] - 8 - Math.pow(index / 10, 4) * 0.9;
    
    // Handle sorting animation phases
    if (sortingPhase === 'underwater') {
      // Send deep underwater during sorting
      baseTargetY = sortingDepth;
      baseTargetZ = position[2]; // Use original Z position underwater
      baseTargetX = position[0]; // Use original X position underwater
    } else if (!isVisible && sortingPhase === 'none') {
      // Send to regular depth when filtered out (not sorting)
      baseTargetY = underwaterDepth;
      baseTargetZ = position[2]; // Use original Z position underwater
      baseTargetX = position[0]; // Use original X position underwater
    } else if (sortingPhase === 'surfacing') {
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
    
    // Apply collision detection to prevent overlapping
    const rawTargetPos = new THREE.Vector3(baseTargetX, baseTargetY + 28, baseTargetZ);
    const collisionFreePos = checkCollisions(rawTargetPos);
    
    // Determine easing speed based on type of movement
    let currentEase = liftEase; // Default for normal hover/bob movements
    let yEase = liftEase; // Separate easing for Y position
    
    if (sortingPhase === 'underwater') {
      // Fast movement for going deep underwater during sorting
      currentEase = underwaterEase;
      yEase = underwaterEase;
    } else if (!isVisible && sortingPhase === 'none') {
      // Fast movement for going underwater when filtered out
      currentEase = underwaterEase;
      yEase = underwaterEase;
    } else if (sortingPhase === 'surfacing') {
      // Medium speed for surfacing
      currentEase = 0.08;
      yEase = 0.08;
    } else if (targetPosition && 
               (Math.abs(basePos[0] - position[0]) > 0.1 || 
                Math.abs(basePos[2] - position[2]) > 0.1)) {
      // Slow movement for repositioning visible posts that moved positions
      currentEase = hovered ? hoverEase : repositionEase;
      
      // Check if X and Z positions are close to target - if so, allow Y movement
      const xCloseToTarget = Math.abs(g.position.x - collisionFreePos.x) < 5;
      const zCloseToTarget = Math.abs(g.position.z - collisionFreePos.z) < 5;
      
      if (xCloseToTarget && zCloseToTarget) {
        yEase = currentEase; // Normal Y movement when X/Z are in position
      } else {
        yEase = 0.02; // Very slow Y movement while X/Z are moving
      }
    }
    
    // Update the allPostPositions map with our current position for other cubes
    if (allPostPositions) {
      allPostPositions.set(index, g.position.clone());
    }
    
    // Move X and Z first with normal easing
    g.position.x = MathUtils.lerp(g.position.x, collisionFreePos.x, currentEase);
    g.position.z = MathUtils.lerp(g.position.z, collisionFreePos.z, currentEase);
    
    // Move Y with potentially different easing (slower until X/Z are in position)
    g.position.y = MathUtils.lerp(g.position.y, collisionFreePos.y, yEase);
    g.rotation.x = MathUtils.lerp(g.rotation.x, targetRotX, liftEase);
    g.rotation.y = MathUtils.lerp(g.rotation.y, targetRotY, liftEase);
    g.rotation.z = MathUtils.lerp(g.rotation.z, targetRotZ, liftEase);
  });

  // --- Pointer events ---
  const handlePointerOver = () => {
    if (!isVisible || sortingPhase !== 'none') return; // Don't allow hover when underwater or sorting
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };
  
  const handleClick = () => {
    if (!isVisible || sortingPhase !== 'none') return; // Don't allow clicks when underwater or sorting
    onClick();
  };

  // Always render when in extended frustum for text pre-loading, or when sorting/filtering
  const shouldRender = inFrustum || isVisible || sortingPhase !== 'none';
  
  // Debug: Log frustum culling in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && index === 0) {
      console.log(`🎥 PostCube frustum culling: ${inFrustum ? 'visible' : 'culled'} (shouldRender: ${shouldRender})`);
    }
  }, [inFrustum, shouldRender, index]);
  
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
            return (
              <React.Fragment key={i}>
                <mesh
                  geometry={geo}
                  material={neonMat}
                  scale={[wordScale, wordScale, 0.04]}
                  position={[
                    frontCenterX + 2,
                    frontCenterY + lineOffsets[i],
                    zBase,
                  ]}
                />
                {/* Glow effect disabled for performance */}
              </React.Fragment>
            );
          })}

          {/* Simplified lighting for better performance */}
          <ambientLight intensity={0.3} />
          <hemisphereLight groundColor={0x101010} intensity={0.8} />
        </>
      )}
    </group>
  );
}

// --- 4. Direct PostBox export (no longer needs Suspense) ---
const PostBox: React.FC<PostBoxProps> = (props) => {
  return <PostBoxCore {...props} />;
};

export default PostBox;
