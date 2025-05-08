import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { lightgrey, primary } from "./components/Styled";

interface PostBoxProps {
  title: string;
  position: [number, number, number];
  onClick: () => void;
}

/** Wraps text into lines to fit within maxWidth */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(current + " " + word).width;
    if (width < maxWidth) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

const createTextTexture = (text: string): THREE.Texture => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // background
  ctx.fillStyle = lightgrey;
  ctx.fillRect(0, 0, size, size);

  // text style
  const fontSize = 45;
  ctx.font = `bold ${fontSize}px tourner, monospace`;
  ctx.fillStyle = primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // wrap into lines
  const maxTextWidth = size * 0.9; // 90% of canvas width
  const lines = wrapText(ctx, text, maxTextWidth);
  const lineHeight = fontSize * 1.2;

  // draw each line centered vertically
  const startY = size / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, size / 2, startY + i * lineHeight);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const PostBox: React.FC<PostBoxProps> = ({ title, position, onClick }) => {
  const ref = useRef<THREE.Mesh>(null!);
  const texture = useMemo(() => createTextTexture(title), [title]);

  // animate up/down and slight rotation
  useFrame((state) => {
    ref.current.position.y =
      position[1] + Math.sin(state.clock.getElapsedTime() * 2) * 0.1;
    ref.current.rotation.y = Math.sin(state.clock.getElapsedTime()) * 0.04;
    ref.current.rotation.z = Math.sin(state.clock.getElapsedTime()) * 0.02;
    ref.current.rotation.y -= 0.7;
    ref.current.rotation.x = Math.cos(state.clock.getElapsedTime()) * 0.03;
  });

  // build six materials: only the front face gets the text texture
  const materials = useMemo(() => {
    const texturedMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      metalness: 0,
    });
    const flatMat = new THREE.MeshStandardMaterial({
      color: lightgrey,
      roughness: 1,
      metalness: 0,
    });
    // BoxGeometry face order is [+X, -X, +Y, -Y, +Z, -Z]
    // let’s put our text on the front (+Z = index 4)
    return [
      flatMat, // +X
      flatMat, // -X
      flatMat, // +Y
      flatMat, // -Y
      texturedMat, // +Z (front)
      flatMat, // -Z
    ];
  }, [texture]);

  return (
    <mesh
      ref={ref}
      position={position}
      material={materials}
      onClick={onClick}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[50, 50, 50]} />
    </mesh>
  );
};

export default PostBox;
