import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ScrollCameraProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  lerpFactor?: number;
}

export function ScrollCamera({
  start,
  end,
  lerpFactor = 0.01,
}: ScrollCameraProps) {
  const { camera } = useThree();
  const [target] = useState(() => start.clone());

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const maxScroll = document.body.scrollHeight - window.innerHeight;
      const t = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      // compute the instantaneous target:
      target.copy(start).lerp(end, t);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // init
    return () => window.removeEventListener("scroll", onScroll);
  }, [start, end, target]);

  useFrame(() => {
    // smoothly move camera toward our computed target
    camera.position.lerp(target, lerpFactor);
    // adjust lookAt as needed; here we look at the origin
    // camera.lookAt(-115, 18, 196);
  });

  return null;
}
