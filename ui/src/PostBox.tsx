import React, { useRef, useMemo, useState, useEffect } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import fontJson from "./fonts/gentilis_regular.typeface.json";
import { FontLoader, Font } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import blockModelUrl from "./models/rubikscube/scene.gltf?url";
import { MathUtils } from "three";

// helper to wrap text into lines no wider than maxWidth (local units)
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
    const w =
      testGeo.boundingBox!.max.x - testGeo.boundingBox!.min.x || Infinity;
    testGeo.dispose(); // free immediately
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

interface PostBoxProps {
  title: string;
  index: number;
  position: [number, number, number];
  onClick: () => void;
}

const PostBox: React.FC<PostBoxProps> = ({
  title,
  index,
  position,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  // ─── LOADERS & FONTS ───────────────────────────────────────────────────────────
  const gltf = useLoader(GLTFLoader, blockModelUrl);
  const font = useMemo(() => new FontLoader().parse(fontJson), []);

  // ─── SCENE CLONE + BBOX ─────────────────────────────────────────────────────────
  const blockScene = useMemo(() => gltf.scenes[0].clone(true), [gltf]);
  const bbox = useMemo(
    () => new THREE.Box3().setFromObject(blockScene),
    [blockScene],
  );

  const frontWidth = bbox.max.x - bbox.min.x;
  const frontHeight = bbox.max.y - bbox.min.y;
  const frontCenterX = bbox.min.x + frontWidth / 2;
  const frontCenterY = bbox.min.y + frontHeight / 2;

  // ─── TEXT LAYOUT ────────────────────────────────────────────────────────────────
  const fontSize = 0.2;
  const wordScale = 12;
  const desiredGapWorld = 50;
  const lineGap = desiredGapWorld / wordScale;
  const textMargin = 0.8;

  const lines = useMemo(
    () => wrapLines(title, font, fontSize, frontWidth),
    [title, font, fontSize, frontWidth],
  );

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
      geo.center(); // center each line around origin
      return geo;
    });
  }, [lines, font, fontSize]);

  // dispose text geometries on unmount
  useEffect(() => {
    return () => {
      textGeometries.forEach((g) => g.dispose());
    };
  }, [textGeometries]);

  // measure each line’s height
  const lineHeights = useMemo(
    () =>
      textGeometries.map(
        (g) => g.boundingBox!.max.y - g.boundingBox!.min.y || 0,
      ),
    [textGeometries],
  );

  const totalTextHeight = useMemo(() => {
    return (
      lineHeights.reduce((sum, h) => sum + h, 0) +
      (lineHeights.length - 1) * lineGap
    );
  }, [lineHeights, lineGap]);

  const lineOffsets = useMemo(() => {
    const offs: number[] = [];
    let cursor = totalTextHeight / 2;
    for (const h of lineHeights) {
      offs.push(cursor - h / 2);
      cursor -= h + lineGap;
    }
    return offs;
  }, [lineHeights, totalTextHeight, lineGap]);

  // ─── BACKDROP GEOMETRY & DISPOSAL ───────────────────────────────────────────────
  const backdropGeo = useMemo(
    () =>
      new THREE.PlaneGeometry(
        frontWidth + 50 * textMargin,
        frontHeight + 26 * textMargin,
      ),
    [frontWidth, frontHeight, textMargin],
  );
  useEffect(() => {
    return () => backdropGeo.dispose();
  }, [backdropGeo]);

  // ─── MATERIALS ─────────────────────────────────────────────────────────────────
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

  // ─── ANIMATION ─────────────────────────────────────────────────────────────────
  const hoverLift = 11;
  const liftEase = 0.1;
  useFrame(({ clock }) => {
    const g = groupRef.current;
    const t = clock.getElapsedTime();

    // bob vs lift
    const bob = position[1] + Math.sin(t * 2) * 0.1;
    const targetY = hovered ? position[1] + hoverLift : bob;
    const targetZ = hovered
      ? position[2] + 10 + Math.pow(index / 10, 4) * 0.9
      : position[2] + 8 + Math.pow(index / 10, 4) * 0.9;
    const targetX = hovered
      ? position[0] - 10 - Math.pow(index / 10, 4) * 0.9
      : position[0] - 8 - Math.pow(index / 10, 4) * 0.9;

    // wiggle
    const wiggleDelta = 0.02 + (Math.sin(index) + 0.1) * 0.15;
    const targetRotX = hovered ? 0 : -0.01 + Math.cos(t) * 0.01 + wiggleDelta;
    const targetRotY = hovered
      ? -0.8 - Math.pow(index / 10, 2) * 0.1
      : Math.sin(t) * 0.03 - 0.5 - wiggleDelta;
    const targetRotZ = hovered ? 0 : Math.sin(t) * 0.04 + wiggleDelta;

    // ease into
    g.position.x = MathUtils.lerp(g.position.x, targetX, liftEase);
    g.position.y = MathUtils.lerp(g.position.y, targetY + 34, liftEase);
    g.position.z = MathUtils.lerp(g.position.z, targetZ, liftEase);
    g.rotation.x = MathUtils.lerp(g.rotation.x, targetRotX, liftEase);
    g.rotation.y = MathUtils.lerp(g.rotation.y, targetRotY, liftEase);
    g.rotation.z = MathUtils.lerp(g.rotation.z, targetRotZ, liftEase);
  });

  // ─── EVENTS ────────────────────────────────────────────────────────────────────
  const handlePointerOver = () => {
    setHovered(true);
    document.body.style.cursor = "pointer";
  };
  const handlePointerOut = () => {
    setHovered(false);
    document.body.style.cursor = "auto";
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <group
      ref={groupRef}
      position={position}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Block */}
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
};

export default PostBox;
