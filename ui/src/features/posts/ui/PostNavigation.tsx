import { useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Vector3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, CircleGeometry, PlaneGeometry, AdditiveBlending, BackSide, DoubleSide, Object3D } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";
import { triggerMobileHapticFeedback } from "../../../shared/services/haptics";
import { DARK_SCENE_THEME, LIGHT_SCENE_THEME } from "../../../shared/theme/sceneColors";

interface FollowerSphereProps {
  offset: [number, number, number];
  onLeftClick?: () => void;
  onRightClick?: () => void;
  sphereModel: GLTF;
  font: Font;
  currentPage?: number;
  totalPosts?: number;
  showLeftArrow?: boolean;
  showRightArrow?: boolean;
  isDark?: boolean;
  focusedArrow?: "left" | "right" | null;
}

export default function FollowerSphere({
  offset,
  onLeftClick,
  onRightClick,
  sphereModel,
  font,
  currentPage = 1,
  totalPosts = 10,
  showLeftArrow = true,
  showRightArrow = true,
  isDark = true,
  focusedArrow = null,
}: FollowerSphereProps) {
  const navGroupRef = useRef<Group>(null!);
  const leftHoveredRef = useRef(false);
  const rightHoveredRef = useRef(false);
  const leftPointerHoveredRef = useRef(false);
  const rightPointerHoveredRef = useRef(false);
  const leftHoverT = useRef(0);
  const rightHoverT = useRef(0);
  const { camera, gl } = useThree();
  const colors = isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;

  const labelText = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    if (totalPosts === 0) return "00-00";
    const startPost = totalPosts <= 10 ? 1 : (currentPage - 1) * 10 + 1;
    const endPost = Math.min(currentPage * 10, totalPosts);
    return `${pad(startPost)}-${pad(endPost)}`;
  }, [currentPage, totalPosts]);

  const labelGeo = useMemo(() => {
    const geo = new TextGeometry(labelText, { font, size: 0.2, depth: 0.06 });
    if (typeof window !== "undefined") {
      const w = window as Window & { assetDisposalManager?: { registerAsset: (id: string, asset: BufferGeometry, priority: string) => void } };
      w.assetDisposalManager?.registerAsset(`nav-label-${labelText}`, geo, "low");
    }
    return geo;
  }, [font, labelText]);

  useEffect(() => {
    return () => {
      labelGeo.dispose();
      if (typeof window !== "undefined") {
        const w = window as Window & { assetDisposalManager?: { unregisterAsset: (id: string) => void } };
        w.assetDisposalManager?.unregisterAsset(`nav-label-${labelText}`);
      }
    };
  }, [labelGeo, labelText]);

  const leftGeo = useMemo(() => new TextGeometry("<", { font, size: 0.62, depth: 0.18 }), [font]);
  const rightGeo = useMemo(() => new TextGeometry(">", { font, size: 0.67, depth: 0.18 }), [font]);

  const primarySolidMat = useMemo(
    () => new MeshBasicMaterial({
      color: colors.sphereArrowAccentColor,
      transparent: true,
      opacity: colors.sphereLabelOpacity,
      toneMapped: false,
    }),
    [colors.sphereArrowAccentColor, colors.sphereLabelOpacity],
  );
  const labelBackdropMat = useMemo(
    () => new MeshBasicMaterial({
      color: colors.sphereLabelBackdropColor,
      transparent: true,
      opacity: colors.sphereLabelBackdropOpacity,
      toneMapped: false,
    }),
    [isDark],
  );

  // Pre-built Three.js mesh so it gets <primitive> treatment (same as sphereGroup),
  // preventing any R3F reconciler timing difference from causing visual trailing.
  const backdropMesh = useMemo(() => {
    const geo = new CircleGeometry(0.50, 36);
    const m = new Mesh(geo, labelBackdropMat);
    m.name = "label-backdrop";
    m.position.set(-1.24, 0.28, 1.18);
    m.rotation.set(-0.1, -1.0, -0.85);
    return m;
  }, [labelBackdropMat]);

  useEffect(() => {
    return () => { backdropMesh.geometry.dispose(); };
  }, [backdropMesh]);

  const greyOutlineMat = useMemo(
    () => new MeshBasicMaterial({
      color: colors.sphereArrowBodyColor,
      blending: AdditiveBlending,
      transparent: true,
      opacity: colors.sphereArrowBodyOpacity,
      toneMapped: false,
    }),
    [isDark],
  );
  const greenOutlineMat = useMemo(
    () => new MeshBasicMaterial({
      color: colors.sphereArrowAccentColor,
      blending: AdditiveBlending,
      transparent: true,
      opacity: colors.sphereArrowAccentOpacity,
      toneMapped: false,
    }),
    [isDark],
  );

  // Invisible hitbox planes — solid PlaneGeometry covers the gaps in TextGeometry strokes
  // so clicks register anywhere in the arrow's visual bounds, not just on the letter strokes.
  const hitboxMat = useMemo(() => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: DoubleSide }), []);
  const leftArrowHitMesh = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(1.5, 1.5), hitboxMat);
    m.name = "leftArrow";
    m.position.set(-1.4, -0.27, -1.29);
    m.rotation.set(-1.43, -1.17, -1.22);
    return m;
  }, [hitboxMat]);
  const rightArrowHitMesh = useMemo(() => {
    const m = new Mesh(new PlaneGeometry(1.5, 1.5), hitboxMat);
    m.name = "rightArrow";
    m.position.set(2.85, -0.53, -0.30);
    m.rotation.set(1.43, 1.27, 1.42);
    return m;
  }, [hitboxMat]);

  // Pre-built overlay meshes — <primitive> so R3F only checks object identity on re-render,
  // avoiding the per-prop .set() calls that JSX <mesh> triggers on every hover state change.
  const labelMesh = useMemo(() => {
    const m = new Mesh(labelGeo, primarySolidMat);
    m.name = "label-solid";
    m.position.set(-1.55, 0.2, 1);
    m.rotation.set(-1.1, -1.05, -0.85);
    return m;
  }, [labelGeo, primarySolidMat]);

  const leftArrowOutlineMesh = useMemo(() => {
    const m = new Mesh(leftGeo, greenOutlineMat);
    m.name = "leftArrow-outline";
    m.position.set(-1.4, -0.27, -1.29);
    m.rotation.set(-1.43, -1.17, -1.22);
    m.scale.setScalar(0.0001);
    return m;
  }, [leftGeo, greenOutlineMat]);

  const leftArrowMesh = useMemo(() => {
    const m = new Mesh(leftGeo, greyOutlineMat);
    m.name = "leftArrow";
    m.position.set(-1.4, -0.27, -1.29);
    m.rotation.set(-1.43, -1.17, -1.22);
    return m;
  }, [leftGeo, greyOutlineMat]);

  const rightArrowOutlineMesh = useMemo(() => {
    const m = new Mesh(rightGeo, greenOutlineMat);
    m.name = "rightArrow-outline";
    m.position.set(2.85, -0.53, -0.30);
    m.rotation.set(1.43, 1.27, 1.42);
    m.scale.setScalar(0.0001);
    return m;
  }, [rightGeo, greenOutlineMat]);

  const rightArrowMesh = useMemo(() => {
    const m = new Mesh(rightGeo, greyOutlineMat);
    m.name = "rightArrow";
    m.position.set(2.85, -0.53, -0.30);
    m.rotation.set(1.43, 1.27, 1.42);
    m.scale.set(1.04, 1.04, 1.04);
    return m;
  }, [rightGeo, greyOutlineMat]);

  const [glowShellGeo, glowShellMat] = useMemo(() => {
    let maxRadius = 0;
    sphereModel.scene.traverse((child) => {
      if (child instanceof Mesh) {
        const geom = child.geometry as BufferGeometry;
        if (!geom.boundingSphere) geom.computeBoundingSphere();
        maxRadius = Math.max(maxRadius, geom.boundingSphere!.radius);
      }
    });
    const geo = new SphereGeometry(maxRadius * 0.33, 14, 14);
    const mat = new MeshBasicMaterial({
      color: DARK_SCENE_THEME.sphereGlowColor,
      side: BackSide,
      transparent: true,
      opacity: DARK_SCENE_THEME.sphereGlowOpacity,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    return [geo, mat] as const;
  }, [sphereModel]);

  const sphereGroup = useMemo(() => {
    const group = new Group();

    const shell = new Mesh(glowShellGeo, glowShellMat);
    shell.renderOrder = 0;
    shell.position.set(-1.31, 0.33, 1.24);
    group.add(shell);

    const sphereClone = sphereModel.scene.clone(true);
    sphereClone.traverse((child) => {
      if (child instanceof Mesh) {
        const mat = (child.material as MeshStandardMaterial).clone();
        mat.map = null;
        mat.metalnessMap = null;
        mat.roughnessMap = null;
        mat.normalMap = null;
        mat.metalness = DARK_SCENE_THEME.sphereMetalness;
        mat.roughness = DARK_SCENE_THEME.sphereRoughness;
        mat.envMapIntensity = DARK_SCENE_THEME.sphereEnvMapIntensity;
        mat.color.setHex(DARK_SCENE_THEME.sphereBodyColor);
        child.material = mat;
        child.renderOrder = 1;
      }
    });
    sphereClone.rotation.set(1, -1, 0);
    group.add(sphereClone);

    return group;
  }, [sphereModel, glowShellGeo, glowShellMat]);

  // Stable container — [] deps means R3F mounts this once and never remounts it.
  // Children are managed imperatively via useLayoutEffect (fires before next RAF).
  const navGroup = useMemo(() => {
    const group = new Group();
    group.scale.set(3, 3, 3);
    navGroupRef.current = group;
    return group;
  }, []);

  function syncHoverState() {
    "use no memo";
    leftHoveredRef.current =
      showLeftArrow && (leftPointerHoveredRef.current || focusedArrow === "left");
    rightHoveredRef.current =
      showRightArrow && (rightPointerHoveredRef.current || focusedArrow === "right");
  }

  useLayoutEffect(() => {
    navGroupRef.current.add(sphereGroup);
    return () => { navGroupRef.current.remove(sphereGroup); };
  }, [sphereGroup]);

  useLayoutEffect(() => {
    navGroupRef.current.add(backdropMesh);
    return () => { navGroupRef.current.remove(backdropMesh); };
  }, [backdropMesh]);

  useLayoutEffect(() => {
    navGroupRef.current.add(labelMesh);
    return () => { navGroupRef.current.remove(labelMesh); };
  }, [labelMesh]);

  useLayoutEffect(() => {
    if (!showLeftArrow) {
      leftPointerHoveredRef.current = false;
      leftHoveredRef.current = false;
      leftHoverT.current = 0;
    }
    leftArrowMesh.visible = showLeftArrow;
    leftArrowHitMesh.visible = showLeftArrow;
    syncHoverState();
    navGroupRef.current.add(leftArrowMesh, leftArrowOutlineMesh, leftArrowHitMesh);
    return () => { navGroupRef.current.remove(leftArrowMesh, leftArrowOutlineMesh, leftArrowHitMesh); };
  }, [focusedArrow, leftArrowMesh, leftArrowOutlineMesh, leftArrowHitMesh, showLeftArrow]);

  useLayoutEffect(() => {
    if (!showRightArrow) {
      rightPointerHoveredRef.current = false;
      rightHoveredRef.current = false;
      rightHoverT.current = 0;
    }
    rightArrowMesh.visible = showRightArrow;
    rightArrowHitMesh.visible = showRightArrow;
    syncHoverState();
    navGroupRef.current.add(rightArrowMesh, rightArrowOutlineMesh, rightArrowHitMesh);
    return () => { navGroupRef.current.remove(rightArrowMesh, rightArrowOutlineMesh, rightArrowHitMesh); };
  }, [focusedArrow, rightArrowMesh, rightArrowOutlineMesh, rightArrowHitMesh, showRightArrow]);

  // Update sphere materials reactively when theme changes
  useEffect(() => {
    glowShellMat.color.setHex(colors.sphereGlowColor);
    glowShellMat.opacity = colors.sphereGlowOpacity;

    sphereGroup.traverse((child: Object3D) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as MeshStandardMaterial;
      if (mat?.isMeshStandardMaterial) {
        mat.map = null;
        mat.metalnessMap = null;
        mat.roughnessMap = null;
        mat.normalMap = null;
        mat.metalness = colors.sphereMetalness;
        mat.roughness = colors.sphereRoughness;
        mat.envMapIntensity = colors.sphereEnvMapIntensity;
        mat.color.setHex(colors.sphereBodyColor);
        mat.needsUpdate = true;
      }
    });
  }, [isDark, sphereGroup, glowShellMat]);

  useFrame(() => {
    const camPos = camera.position.clone().add(new Vector3(...offset));
    camPos.x += 1.5;
    navGroupRef.current.position.copy(camPos);

    // Lerp hover progress (0 → 1 on hover, 1 → 0 on leave)
    leftHoverT.current += ((leftHoveredRef.current ? 1 : 0) - leftHoverT.current) * 0.12;
    rightHoverT.current += ((rightHoveredRef.current ? 1 : 0) - rightHoverT.current) * 0.12;

    // Scale arrows up on hover
    const ls = 0.92 + 0.24 * leftHoverT.current;
    leftArrowMesh.scale.setScalar(ls);
    leftArrowOutlineMesh.scale.setScalar(leftHoveredRef.current ? ls : 0.0001);
    leftArrowHitMesh.scale.setScalar(ls);
    const leftHoverY = -0.30 - 0.10 * leftHoverT.current;
    leftArrowMesh.position.set(-1.4, leftHoverY, -1.29);
    leftArrowOutlineMesh.position.set(-1.4, leftHoverY, -1.29);
    leftArrowHitMesh.position.set(-1.4, leftHoverY, -1.29);

    const rs = 1.04 + 0.24 * rightHoverT.current;
    rightArrowMesh.scale.setScalar(rs);
    rightArrowOutlineMesh.scale.setScalar(rightHoveredRef.current ? rs : 0.0001);
    rightArrowHitMesh.scale.setScalar(rs);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const name = e.object.name;
    if (showLeftArrow && (name === "leftArrow" || name === "leftArrow-outline")) {
      triggerMobileHapticFeedback();
      onLeftClick?.();
    }
    if (showRightArrow && (name === "rightArrow" || name === "rightArrow-outline")) {
      triggerMobileHapticFeedback();
      onRightClick?.();
    }
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (showLeftArrow && (name === "leftArrow" || name === "leftArrow-outline")) {
      leftPointerHoveredRef.current = true;
      syncHoverState();
      gl.domElement?.style.setProperty("cursor", "pointer");
    }
    if (showRightArrow && (name === "rightArrow" || name === "rightArrow-outline")) {
      rightPointerHoveredRef.current = true;
      syncHoverState();
      gl.domElement?.style.setProperty("cursor", "pointer");
    }
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (name === "leftArrow" || name === "leftArrow-outline") {
      leftPointerHoveredRef.current = false;
      syncHoverState();
      gl.domElement?.style.setProperty("cursor", "auto");
    }
    if (name === "rightArrow" || name === "rightArrow-outline") {
      rightPointerHoveredRef.current = false;
      syncHoverState();
      gl.domElement?.style.setProperty("cursor", "auto");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        const w = window as Window & { assetDisposalManager?: { unregisterAsset: (id: string) => void } };
        w.assetDisposalManager?.unregisterAsset(`nav-label-${labelText}`);
      }
      labelGeo.dispose();
      leftGeo.dispose();
      rightGeo.dispose();
      glowShellGeo.dispose();
      leftArrowHitMesh.geometry.dispose();
      rightArrowHitMesh.geometry.dispose();
      primarySolidMat.dispose();
      labelBackdropMat.dispose();
      greyOutlineMat.dispose();
      greenOutlineMat.dispose();
      glowShellMat.dispose();
      hitboxMat.dispose();
      gl.domElement?.style.setProperty("cursor", "auto");
    };
  }, [labelGeo, leftGeo, rightGeo, glowShellGeo, leftArrowHitMesh, rightArrowHitMesh, primarySolidMat, labelBackdropMat, greyOutlineMat, greenOutlineMat, glowShellMat, hitboxMat, labelText, gl.domElement]);

  return (
    <primitive
      object={navGroup}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
