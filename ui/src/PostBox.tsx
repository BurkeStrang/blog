import React, { useRef, useMemo, useEffect, Suspense, useState } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import blockModelUrl from "./models/rubikscube/scene.gltf?url";
import fontJson from "./fonts/gentilis_regular.typeface.json"; // still sync, but we'll wrap this in a custom hook
import { MathUtils } from "three";
import type { FontData } from "three/examples/jsm/loaders/FontLoader";

// --- 1. Custom hooks for loading font/model efficiently ---

function useFont(fontJson: FontData): Font {
  // Only parse once per font file
  return useMemo(() => new FontLoader().parse(fontJson), [fontJson]);
}

// --- 2. Text line wrapping optimized: avoid geometry creation in loop ---
function measureTextWidth(line: string, font: Font, size: number): number {
  // Uses the font data's "generateShapes" for cheap width estimate
  const shapes = font.generateShapes(line, size);
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.computeBoundingBox();
  const width = geometry.boundingBox
    ? geometry.boundingBox.max.x - geometry.boundingBox.min.x
    : 0;
  geometry.dispose();
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
}

const fontSize = 0.2;
const wordScale = 12;
const textMargin = 0.8;

function PostBoxCore(props: PostBoxProps & { font: Font }) {
  const { title, index, position, onClick, font } = props;
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // --- GLTF Model, only loads once (scene cloning below) ---
  const gltf = useLoader(GLTFLoader, blockModelUrl);

  // --- Block geometry/bounds ---
  const blockScene = useMemo(() => gltf.scenes[0].clone(true), [gltf]);
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

  // --- Dispose geometries on unmount ---
  useEffect(() => {
    return () => textGeometries.forEach((g) => g.dispose());
  }, [textGeometries]);

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
  useEffect(() => () => backdropGeo.dispose(), [backdropGeo]);

  // --- Materials (memoize, share across renders) ---
  const backdropMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        opacity: 0.8,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    []
  );
  const neonMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x006060,
        emissive: 0x00ffff,
        roughness: 1,
        metalness: 1,
        toneMapped: false,
        transparent: true,
      }),
    []
  );
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x000066,
        side: THREE.BackSide,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: true,
      }),
    []
  );

  // --- Animation (frame loop) ---
  const hoverLift = 11;
  const liftEase = 0.1;
  useFrame(({ clock }) => {
    const g = groupRef.current;
    const t = clock.getElapsedTime();
    // Animate: lerped hover lift, wiggle
    const bob = position[1] + Math.sin(t * 2) * 0.1;
    const targetY = hovered ? position[1] + hoverLift : bob;
    const targetZ = hovered
      ? position[2] + 10 + Math.pow(index / 10, 4) * 0.9
      : position[2] + 8 + Math.pow(index / 10, 4) * 0.9;
    const targetX = hovered
      ? position[0] - 10 - Math.pow(index / 10, 4) * 0.9
      : position[0] - 8 - Math.pow(index / 10, 4) * 0.9;
    const wiggleDelta = 0.02 + (Math.sin(index) + 0.1) * 0.15;
    const targetRotX = hovered ? 0 : -0.01 + Math.cos(t) * 0.01 + wiggleDelta;
    const targetRotY = hovered
      ? -0.8 - Math.pow(index / 10, 2) * 0.1
      : Math.sin(t) * 0.03 - 0.5 - wiggleDelta;
    const targetRotZ = hovered ? 0 : Math.sin(t) * 0.04 + wiggleDelta;
    g.position.x = MathUtils.lerp(g.position.x, targetX, liftEase);
    g.position.y = MathUtils.lerp(g.position.y, targetY + 34, liftEase);
    g.position.z = MathUtils.lerp(g.position.z, targetZ, liftEase);
    g.rotation.x = MathUtils.lerp(g.rotation.x, targetRotX, liftEase);
    g.rotation.y = MathUtils.lerp(g.rotation.y, targetRotY, liftEase);
    g.rotation.z = MathUtils.lerp(g.rotation.z, targetRotZ, liftEase);
  });

  // --- Pointer events ---
  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  // --- Render ---
  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
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

// --- 4. Lazy/Suspense wrapper for font loading (to avoid blocking the app startup) ---
const PostBox: React.FC<PostBoxProps> = (props) => {
  // Only parse font once globally (fast), can be async with real font files
  const font = useFont(fontJson);

  return (
    <Suspense fallback={null}>
      <PostBoxCore {...props} font={font} />
    </Suspense>
  );
};

export default PostBox;
