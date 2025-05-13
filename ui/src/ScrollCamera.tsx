import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ScrollCameraProps {
  positions: THREE.Vector3[];
  lerpFactor: number;
}

export function ScrollCamera({ positions, lerpFactor }: ScrollCameraProps) {
  const { camera, gl } = useThree();
  // accumulated “virtual scroll” value
  const [scrollY, setScrollY] = useState(0);

  // clamp helper
  const clamp = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

  useEffect(() => {
    const canvas = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      // prevent page from actually scrolling
      e.preventDefault();
      // accumulate, then clamp to some max range
      setScrollY((current) =>
        clamp(current + e.deltaY, 0, (positions.length - 1) * 100),
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => void canvas.removeEventListener("wheel", onWheel);
  }, [gl.domElement, positions.length]);

  useFrame(() => {
    // map scrollY to a t ∈ [0,1]
    const max = (positions.length - 1) * 100;
    const t = clamp(scrollY / max, 0, 1);
    const idx = Math.round(t * (positions.length - 1));
    const target = positions[idx];

    console.log(idx, "idx");
    console.log("target", target);

    // offset your camera however you like
    const dest = target.clone();
    camera.position.lerp(dest, lerpFactor);
    // camera.lookAt(target);
  });

  return null;
}
