import React, { useRef, useMemo, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import fontJson from "./fonts/gentilis_regular.typeface.json";
import { Font, FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import blockModelUrl from "./models/standard_mirror_rubiks_cube_silver.glb?url";
import { MathUtils } from "three";

interface PostBoxProps {
  title: string;
  index: number;
  position: [number, number, number];
  onClick: () => void;
}

// wrap into lines ≤ maxWidth (local units)
function wrapLines(
  text: string,
  font: Font,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${current} ${word}`;
    const testGeo = new TextGeometry(testLine, { font, size });
    testGeo.computeBoundingBox();
    const w = testGeo.boundingBox!.max.x - testGeo.boundingBox!.min.x;
    if (w > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  }
  lines.push(current);
  return lines;
}

const PostBox: React.FC<PostBoxProps> = ({
  title,
  index,
  position,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => onClick();
  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  // ─── LOADING & METRICS ────────────────────────────────────────────────────────
  const gltf = useLoader(GLTFLoader, blockModelUrl);
  const font = useMemo(() => new FontLoader().parse(fontJson), []);

  const fontSize = 0.2; // local geometry units
  const wordScale = 12; // how much to scale everything up
  const desiredGapWorld = 50; // world-unit gap between lines
  const lineGap = desiredGapWorld / wordScale; // convert to local
  const textMargin = 0.8; // local

  // grab the block’s bounding box **in local units**
  const blockScene = useMemo(() => gltf.scenes[0].clone(true), [gltf]);
  const bbox = useMemo(
    () => new THREE.Box3().setFromObject(blockScene),
    [blockScene],
  );

  // front-face dimensions & center
  const frontWidth = bbox.max.x - bbox.min.x;
  const frontHeight = bbox.max.y - bbox.min.y;
  const frontCenterX = bbox.min.x + frontWidth / 2;
  const frontCenterY = bbox.min.y + frontHeight / 2;

  // wrap text to fit within the front face width
  const lines = useMemo(
    () => wrapLines(title, font, fontSize, frontWidth),
    [title, font, fontSize, frontWidth],
  );

  // build & center each line geometry
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
      geo.center(); // center around origin
      geo.computeBoundingBox();
      return geo;
    });
  }, [lines, font, fontSize]);

  // measure each line’s height in local units
  const lineHeights = useMemo(
    () =>
      textGeometries.map((g) => g.boundingBox!.max.y - g.boundingBox!.min.y),
    [textGeometries],
  );

  // total block of text height
  const totalTextHeight = useMemo(() => {
    return (
      lineHeights.reduce((sum, h) => sum + h, 0) +
      (lineHeights.length - 1) * lineGap
    );
  }, [lineHeights, lineGap]);

  // compute offsets so text block centers vertically in front face
  const lineOffsets = useMemo(() => {
    const offs: number[] = [];
    let cursor = totalTextHeight / 2;
    for (const h of lineHeights) {
      offs.push(cursor - h / 2);
      cursor -= h + lineGap;
    }
    return offs;
  }, [lineHeights, totalTextHeight, lineGap]);

  // ─── BACKDROP = exactly front-face size ───────────────────────────────────────
  const backdropMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x000000,
        opacity: 0.8,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  // ─── MATERIALS ────────────────────────────────────────────────────────────────
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
    [],
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
    [],
  );
  const hoverMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x000066,
        emissive: 0x00ffff,
        emissiveIntensity: 10,
        roughness: 1,
        metalness: 1,
        toneMapped: false,
        transparent: true,
      }),
    [],
  );

  // ─── ANIMATION ─────────────────────────────────────────────────────────────────
  //

  const hoverLift = 9; // world units to lift on hover
  const liftEase = 0.1; // how quickly to interpolate (0–1)

  useFrame(({ clock }) => {
    const g = groupRef.current;
    const t = clock.getElapsedTime();

    // --- compute target values ---
    // target Y-pos: bobbing when not hovered, lifted when hovered
    const bob = position[1] + Math.sin(t * 2) * 0.1;
    const targetY = hovered ? position[1] + hoverLift : bob;
    const targetZ = hovered
      ? position[2] + 10 + Math.pow(index / 10, 4) * 0.9
      : position[2] + 8 + Math.pow(index / 10, 4) * 0.9;
    const targetX = hovered
      ? position[0] - 10 - Math.pow(index / 10, 4) * 0.9
      : position[0] - 8 - Math.pow(index / 10, 4) * 0.9;

    // target rotations: zero X/Y when hovered, wiggle when not
    const wiggleDelta = 0.02 + (Math.sin(index) + 0.8) * 0.15;
    const targetRotX = hovered ? 0 : -0.01 + Math.cos(t) * 0.01 + wiggleDelta;
    const targetRotY = hovered
      ? -0.8 - Math.pow(index / 10, 2) * 0.1
      : Math.sin(t) * 0.03 - 0.5 - wiggleDelta;
    const targetRotZ = hovered ? 0 : Math.sin(t) * 0.04 + wiggleDelta;

    // --- ease into position ---
    g.position.x = MathUtils.lerp(g.position.x, targetX, liftEase);
    g.position.z = MathUtils.lerp(g.position.z, targetZ, liftEase);
    g.position.y = MathUtils.lerp(g.position.y + 4, targetY, liftEase);

    // --- ease into rotation ---
    g.rotation.x = MathUtils.lerp(g.rotation.x, targetRotX, liftEase);
    g.rotation.y = MathUtils.lerp(g.rotation.y, targetRotY, liftEase);
    g.rotation.z = MathUtils.lerp(g.rotation.z, targetRotZ, liftEase);
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* scaled block */}
      <primitive object={blockScene} scale={[16, 16, 16]} />

      {/* backdrop exactly front-face size */}
      <mesh
        geometry={new THREE.PlaneGeometry(40, 23)}
        material={backdropMaterial}
        scale={[1, 1, 1]}
        position={[
          frontCenterX + 4,
          frontCenterY,
          bbox.max.z + textMargin + 22,
        ]}
      />

      {/* text lines, centered */}
      {textGeometries.map((geo, i) => (
        <React.Fragment key={i}>
          <mesh
            geometry={geo}
            material={neonMat}
            scale={[wordScale, wordScale, 0.04]}
            position={[
              frontCenterX + 2,
              frontCenterY + lineOffsets[i],
              bbox.max.z + textMargin - 0.02 + 27,
            ]}
          />
          <mesh
            geometry={geo}
            material={glowMat}
            scale={[wordScale * 1.01, wordScale * 1.01, 0.2]}
            position={[
              frontCenterX + 2,
              frontCenterY + lineOffsets[i],
              bbox.max.z + textMargin - 0.02 + 27,
            ]}
          />
          {hovered && (
            <mesh
              geometry={geo}
              material={hoverMat}
              scale={[wordScale * 1.02, wordScale * 1.02, 0.04]}
              position={[
                frontCenterX + 2,
                frontCenterY + lineOffsets[i],
                bbox.max.z + textMargin + 0.02 + 27,
              ]}
            />
          )}
        </React.Fragment>
      ))}

      {/* lights */}
      <ambientLight intensity={0.9} />
      <hemisphereLight groundColor={0x444444} intensity={0.4} />
      <directionalLight
        position={[100, 100, 100]}
        intensity={1.2}
        castShadow
      />
      <pointLight position={[500, 300, 0]} intensity={0.6} />
    </group>
  );
};

export default PostBox;
