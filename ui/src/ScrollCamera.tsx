import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ScrollCameraProps {
  positions: THREE.Vector3[];
  lerpFactor: number;
  /** how many “units” one wheel‐notch or arrow press moves you */
  stepSize: number;
}

export function ScrollCamera({
  positions,
  lerpFactor,
  stepSize,
}: ScrollCameraProps) {
  const { camera, gl } = useThree();
  const [scrollY, setScrollY] = useState(0);

  const clamp = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

  // handle wheel and key events
  useEffect(() => {
    const canvas = gl.domElement;
    const maxScroll = ((positions.length - 1) * stepSize) / 1.5;

    // WHEEL
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScrollY((cur) => clamp(cur + e.deltaY / 100, 0, maxScroll));
    };

    // KEYS
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "l") {
        e.preventDefault();
        setScrollY((cur) => clamp(cur + stepSize, 0, maxScroll));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "h") {
        e.preventDefault();
        setScrollY((cur) => clamp(cur - stepSize, 0, maxScroll));
      }
    };

    // TOUCH
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      // record initial finger position
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      // compute how far the finger moved since last event
      const delta = touchStartY - e.touches[0].clientY;
      setScrollY((cur) => clamp(cur + delta / 5, 0, maxScroll));
      // reset baseline so it's relative movement
      touchStartY = e.touches[0].clientY;
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);

      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
    };
  }, [gl.domElement, positions.length, stepSize]);

  useFrame(() => {
    const max = ((positions.length - 1) * stepSize) / 1.5;
    const t = clamp(scrollY / max, 0, 1);
    const idx = Math.round(t * (positions.length - 1));
    const target = positions[idx].clone();
    camera.position.lerp(target, lerpFactor);
  });

  return null;
}
