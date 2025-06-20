import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
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
  position: [number, number, number];
  onClick: () => void;
  rubiksCubeModel: GLTF;
  font: Font;
  onReady?: () => void;
  isVisible?: boolean; // New prop for search filtering
}

const fontSize = 0.2;
const wordScale = 12;
const textMargin = 0.8;

function PostBoxCore(props: PostBoxProps) {
  const { title, index, position, onClick, rubiksCubeModel, font, onReady, isVisible = true } = props;
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

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
        bevelEnabled: true,
        bevelSize: 0.002,
        bevelThickness: 0.002,
        bevelSegments: 12,
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
  const underwaterDepth = -60; // How deep underwater hidden posts go
  const liftEase = 0.1;
  const visibilityEase = 0.05; // Slower easing for underwater transitions
  
  useFrame(({ clock }) => {
    const g = groupRef.current;
    const t = clock.getElapsedTime();
    
    // Animate: lerped hover lift, wiggle
    const bob = position[1] + Math.sin(t * 2) * 0.1;
    
    // Calculate base target positions
    let baseTargetY = hovered ? position[1] + hoverLift : bob;
    let baseTargetZ = hovered
      ? position[2] + 10 + Math.pow(index / 10, 4) * 0.9
      : position[2] + 8 + Math.pow(index / 10, 4) * 0.9;
    let baseTargetX = hovered
      ? position[0] - 10 - Math.pow(index / 10, 4) * 0.9
      : position[0] - 8 - Math.pow(index / 10, 4) * 0.9;
    
    // Override positions if not visible (send underwater)
    if (!isVisible) {
      baseTargetY = underwaterDepth;
      baseTargetZ = position[2]; // Keep original Z position underwater
      baseTargetX = position[0]; // Keep original X position underwater
    }
    
    const wiggleDelta = 0.02 + (Math.sin(index) + 0.1) * 0.15;
    const targetRotX = hovered ? 0 : -0.01 + Math.cos(t) * 0.01 + wiggleDelta;
    const targetRotY = hovered
      ? -0.8 - Math.pow(index / 10, 2) * 0.1
      : Math.sin(t) * 0.03 - 0.5 - wiggleDelta;
    const targetRotZ = hovered ? 0 : Math.sin(t) * 0.04 + wiggleDelta;
    
    // Use different easing speeds for visibility changes vs normal movement
    const currentEase = isVisible ? liftEase : visibilityEase;
    
    g.position.x = MathUtils.lerp(g.position.x, baseTargetX, currentEase);
    g.position.y = MathUtils.lerp(g.position.y, baseTargetY + 34, currentEase);
    g.position.z = MathUtils.lerp(g.position.z, baseTargetZ, currentEase);
    g.rotation.x = MathUtils.lerp(g.rotation.x, targetRotX, liftEase);
    g.rotation.y = MathUtils.lerp(g.rotation.y, targetRotY, liftEase);
    g.rotation.z = MathUtils.lerp(g.rotation.z, targetRotZ, liftEase);
  });

  // --- Pointer events ---
  const handlePointerOver = () => {
    if (!isVisible) return; // Don't allow hover when underwater
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };
  
  const handleClick = () => {
    if (!isVisible) return; // Don't allow clicks when underwater
    onClick();
  };

  // --- Render ---
  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
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

      {/* Text lines */}
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
            <mesh
              geometry={geo}
              material={glowMat}
              scale={[wordScale * 1.01, wordScale * 1.01, 0.2]}
              position={[
                frontCenterX + 2,
                frontCenterY + lineOffsets[i],
                zBase,
              ]}
            />
          </React.Fragment>
        );
      })}

      {/* Lights */}
      <ambientLight intensity={0.1} />
      <hemisphereLight groundColor={0x101010} intensity={1.2} />
      <directionalLight
        position={[-1000, 1000, 1000]}
        intensity={1.8}
        castShadow
      />
      <pointLight position={[1000, -1000, 1000]} intensity={1.5} />
    </group>
  );
}

// --- 4. Direct PostBox export (no longer needs Suspense) ---
const PostBox: React.FC<PostBoxProps> = (props) => {
  return <PostBoxCore {...props} />;
};

export default PostBox;
