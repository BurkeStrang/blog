import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useLocation } from "react-router";
import * as THREE from "three";

interface ScrollCameraProps {
  positions: THREE.Vector3[];
  lerpFactor: number;
  /** how many "units" one wheel‐notch or arrow press moves you */
  stepSize: number;
  /** Position to move to when About route is active */
  aboutModePosition?: THREE.Vector3;
  /** Programmatically set scroll to specific post index */
  scrollToIndex?: number;
  /** Maximum position index allowed on current page */
  maxPositionIndex?: number;
}

function ScrollCamera({
  positions,
  lerpFactor,
  stepSize,
  aboutModePosition = new THREE.Vector3(-500, -5, -500),
  scrollToIndex,
  maxPositionIndex,
}: ScrollCameraProps) {
  const { camera, gl } = useThree();
  const location = useLocation();
  const [scrollY, setScrollY] = useState(0);
  const [originalRotation] = useState(() => camera.rotation.clone());

  // Sunset-flight state: a moving virtual target the camera chases.
  // Direction is the dark-theme sun vector (elev 1.9°, az 158°).
  const aboutTargetRef = useRef(new THREE.Vector3());
  const aboutInitializedRef = useRef(false);
  const lookAheadRef = useRef(new THREE.Vector3());
  const flightDir = useRef(new THREE.Vector3(0.374, 0.033, -0.926).normalize());

  // The flight loops instead of running forever: flightDir points slightly
  // upward, so an unbounded cruise eventually climbs out of the scene and into
  // open sky. After `flightCruiseSeconds` the target eases back to the start
  // and the cruise begins again.
  const aboutPhaseRef = useRef<"cruise" | "return">("cruise");
  const aboutElapsedRef = useRef(0);
  const returnFromRef = useRef(new THREE.Vector3());

  // Check if we're on the About route
  const isAboutRoute = location.pathname === "/about";

  // Use a ref so the keydown handler always sees the current route without re-registering
  const isDetailRef = useRef(false);
  isDetailRef.current = /^\/posts\/[^/]+$/.test(location.pathname);

  const clamp = (v: number, min: number, max: number) =>
    v < min ? min : v > max ? max : v;

  // handle wheel and key events
  useEffect(() => {
    const canvas = gl.domElement;
    // Guard against empty positions array
    if (positions.length === 0) return;

    const maxScroll = ((positions.length - 1) * stepSize) / 1.5;

    // WHEEL
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScrollY((cur) => clamp(cur + e.deltaY / 500, 0, maxScroll));
    };

    // KEYS
    const onKeyDown = (e: KeyboardEvent) => {
      if (isDetailRef.current) return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setScrollY((cur) => clamp(cur + stepSize * 0.6, 0, maxScroll));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setScrollY((cur) => clamp(cur - stepSize * 0.6, 0, maxScroll));
      }
    };

    // TOUCH
    let touchStartY = 0;
    let touchStartX = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      // Calculate deltas for both directions
      const deltaY = e.touches[0].clientY - touchStartY;
      const deltaX = e.touches[0].clientX - touchStartX;

      // Use the larger delta to determine primary swipe direction
      const absDeltaY = Math.abs(deltaY);
      const absDeltaX = Math.abs(deltaX);

      if (absDeltaY > absDeltaX) {
        // Vertical swipe: swipe down = scroll backward, swipe up = scroll forward
        setScrollY((cur) => clamp(cur - deltaY / 150, 0, maxScroll));
      } else {
        // Horizontal swipe: swipe left = scroll forward, swipe right = scroll backward
        setScrollY((cur) => clamp(cur - deltaX / 150, 0, maxScroll));
      }

      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
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

  // Handle programmatic scroll to specific index
  useEffect(() => {
    if (scrollToIndex !== undefined && positions.length > 0) {
      const maxScroll = ((positions.length - 1) * stepSize) / 1.5;
      const targetScrollY = (scrollToIndex * stepSize) / 1.5;
      const clampedScrollY = clamp(targetScrollY, 0, maxScroll);

      setScrollY(clampedScrollY);
    }
  }, [scrollToIndex, positions.length, stepSize]);

  useFrame((state, delta) => {
    // About route: continuously fly toward the sunset.
    // A virtual target advances along flightDir each frame and the
    // camera lerps after it — the offset settles into equilibrium so
    // forward motion is sustained indefinitely.
    if (isAboutRoute) {
      if (!aboutInitializedRef.current) {
        aboutTargetRef.current.copy(aboutModePosition);
        aboutPhaseRef.current = "cruise";
        aboutElapsedRef.current = 0;
        aboutInitializedRef.current = true;
      }

      const flightSpeed = 9; // world units / sec
      const flightCruiseSeconds = 75; // forward flight before heading home
      const flightReturnSeconds = 3; // swoop back to the starting point

      aboutElapsedRef.current += delta;

      if (aboutPhaseRef.current === "cruise") {
        aboutTargetRef.current.addScaledVector(flightDir.current, flightSpeed * delta);
        camera.position.lerp(aboutTargetRef.current, 0.06);

        if (aboutElapsedRef.current >= flightCruiseSeconds) {
          returnFromRef.current.copy(aboutTargetRef.current);
          aboutPhaseRef.current = "return";
          aboutElapsedRef.current = 0;
        }
      } else {
        // Ease the target home on a smoothstep so the reversal starts and ends
        // gently rather than snapping the view back.
        const k = Math.min(aboutElapsedRef.current / flightReturnSeconds, 1);
        const eased = k * k * (3 - 2 * k);
        aboutTargetRef.current.lerpVectors(
          returnFromRef.current,
          aboutModePosition,
          eased,
        );
        camera.position.lerp(aboutTargetRef.current, 0.12);

        if (k >= 1) {
          aboutTargetRef.current.copy(aboutModePosition);
          aboutPhaseRef.current = "cruise";
          aboutElapsedRef.current = 0;
        }
      }

      // Look down the flight vector (toward the sunset on the horizon)
      lookAheadRef.current
        .copy(camera.position)
        .addScaledVector(flightDir.current, 200);
      camera.lookAt(lookAheadRef.current);

      // Subtle bank + pitch wobble layered on top of lookAt
      const t = state.clock.elapsedTime;
      camera.rotation.z += Math.sin(t * 0.35) * 0.07;
      camera.rotation.x += Math.sin(t * 0.22) * 0.018;
      return;
    }

    aboutInitializedRef.current = false;

    // Restore original rotation when not in about mode
    camera.rotation.x = THREE.MathUtils.lerp(
      camera.rotation.x,
      originalRotation.x,
      lerpFactor,
    );
    camera.rotation.y = THREE.MathUtils.lerp(
      camera.rotation.y,
      originalRotation.y,
      lerpFactor,
    );
    camera.rotation.z = THREE.MathUtils.lerp(
      camera.rotation.z,
      originalRotation.z,
      lerpFactor,
    );

    // Guard against empty positions array
    if (positions.length === 0) return;

    // Completely rewrite index calculation to prevent ANY wrapping
    const maxScrollForFrame = ((positions.length - 1) * stepSize) / 1.5;

    // Ensure scrollY is absolutely within bounds
    let safeScrollY = scrollY;
    if (safeScrollY < 0) safeScrollY = 0;
    if (safeScrollY > maxScrollForFrame) safeScrollY = maxScrollForFrame;

    // Calculate index with linear interpolation (no rounding that could wrap)
    let targetIdx;
    if (safeScrollY <= 0) {
      targetIdx = 0;
    } else if (safeScrollY >= maxScrollForFrame) {
      targetIdx = positions.length - 1;
    } else {
      const normalizedScroll = safeScrollY / maxScrollForFrame; // 0 to 1
      targetIdx = Math.round(normalizedScroll * (positions.length - 1));
      if (targetIdx < 0) targetIdx = 0;
    }

    // Final safety clamp (should be redundant but ensures no wrapping)
    const finalIdx = Math.max(0, Math.min(targetIdx, positions.length - 1));

    // Use the provided maxPositionIndex or fall back to positions length
    const maxIndexForCurrentPage =
      maxPositionIndex !== undefined
        ? maxPositionIndex
        : Math.min(9, positions.length - 1);
    const pageConstrainedIdx = Math.min(finalIdx, maxIndexForCurrentPage);

    if (positions[pageConstrainedIdx]) {
      const target = positions[pageConstrainedIdx].clone();
      camera.position.lerp(target, lerpFactor);
    }
  });

  return null;
}

export default ScrollCamera;
