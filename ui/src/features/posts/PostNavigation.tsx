import { useMemo, useRef, useEffect, useLayoutEffect } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Vector3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, CircleGeometry, PlaneGeometry, AdditiveBlending, BackSide, DoubleSide, Object3D } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import type { Font } from "three/examples/jsm/loaders/FontLoader";
import { triggerMobileHapticFeedback } from "../../services/haptics";
import { DARK_SCENE_THEME, LIGHT_SCENE_THEME } from "../../shared/theme/sceneColors";

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
}: FollowerSphereProps) {
  const navGroupRef = useRef<Group>(null!);
  const leftHoveredRef = useRef(false);
  const rightHoveredRef = useRef(false);
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
    const geo = new TextGeometry(labelText, { font, size: 0.25, depth: 0.08 });
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

  const leftGeo = useMemo(() => new TextGeometry("<", { font, size: 0.78, depth: 0.25 }), [font]);
  const rightGeo = useMemo(() => new TextGeometry(">", { font, size: 0.84, depth: 0.25 }), [font]);

  const primarySolidMat = useMemo(
    () => new MeshStandardMaterial({
      color: colors.accentColor,
      emissive: isDark ? colors.accentColor : 0x000000,
      emissiveIntensity: isDark ? 3.4 : 0,
      roughness: 0.28,
      metalness: 0.05,
    }),
    [isDark, colors.accentColor],
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
    m.position.set(1.9, 0.1, 0.5);
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
    m.visible = false;
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
    m.position.set(1.9, 0.1, 0.5);
    m.rotation.set(1.43, 1.27, 1.42);
    m.visible = false;
    return m;
  }, [rightGeo, greenOutlineMat]);

  const rightArrowMesh = useMemo(() => {
    const m = new Mesh(rightGeo, greyOutlineMat);
    m.name = "rightArrow";
    m.position.set(1.9, 0.1, 0.5);
    m.rotation.set(1.43, 1.27, 1.42);
    m.scale.set(1.1, 1.1, 1.1);
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
      leftHoveredRef.current = false;
      leftHoverT.current = 0;
    }
    leftArrowMesh.visible = showLeftArrow;
    leftArrowHitMesh.visible = showLeftArrow;
    leftArrowOutlineMesh.visible = showLeftArrow && leftHoveredRef.current;
    navGroupRef.current.add(leftArrowMesh, leftArrowOutlineMesh, leftArrowHitMesh);
    return () => { navGroupRef.current.remove(leftArrowMesh, leftArrowOutlineMesh, leftArrowHitMesh); };
  }, [leftArrowMesh, leftArrowOutlineMesh, leftArrowHitMesh, showLeftArrow]);

  useLayoutEffect(() => {
    if (!showRightArrow) {
      rightHoveredRef.current = false;
      rightHoverT.current = 0;
    }
    rightArrowMesh.visible = showRightArrow;
    rightArrowHitMesh.visible = showRightArrow;
    rightArrowOutlineMesh.visible = showRightArrow && rightHoveredRef.current;
    navGroupRef.current.add(rightArrowMesh, rightArrowOutlineMesh, rightArrowHitMesh);
    return () => { navGroupRef.current.remove(rightArrowMesh, rightArrowOutlineMesh, rightArrowHitMesh); };
  }, [rightArrowMesh, rightArrowOutlineMesh, rightArrowHitMesh, showRightArrow]);

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
    const ls = 1 + 0.35 * leftHoverT.current;
    leftArrowMesh.scale.setScalar(ls);
    leftArrowOutlineMesh.scale.setScalar(ls);
    leftArrowHitMesh.scale.setScalar(ls);

    const rs = 1.1 + 0.35 * rightHoverT.current;
    rightArrowMesh.scale.setScalar(rs);
    rightArrowOutlineMesh.scale.setScalar(rs);
    rightArrowHitMesh.scale.setScalar(rs);
  });

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const name = e.object.name;
    if (name === "leftArrow" || name === "leftArrow-outline") {
      triggerMobileHapticFeedback();
      onLeftClick?.();
    }
    if (name === "rightArrow" || name === "rightArrow-outline") {
      triggerMobileHapticFeedback();
      onRightClick?.();
    }
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (showLeftArrow && (name === "leftArrow" || name === "leftArrow-outline")) {
      leftHoveredRef.current = true;
      const obj = navGroupRef.current.getObjectByName("leftArrow-outline");
      if (obj) obj.visible = true;
      gl.domElement?.style.setProperty("cursor", "pointer");
    }
    if (showRightArrow && (name === "rightArrow" || name === "rightArrow-outline")) {
      rightHoveredRef.current = true;
      const obj = navGroupRef.current.getObjectByName("rightArrow-outline");
      if (obj) obj.visible = true;
      gl.domElement?.style.setProperty("cursor", "pointer");
    }
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (name === "leftArrow" || name === "leftArrow-outline") {
      leftHoveredRef.current = false;
      const obj = navGroupRef.current.getObjectByName("leftArrow-outline");
      if (obj) obj.visible = showLeftArrow && leftHoveredRef.current;
      gl.domElement?.style.setProperty("cursor", "auto");
    }
    if (name === "rightArrow" || name === "rightArrow-outline") {
      rightHoveredRef.current = false;
      const obj = navGroupRef.current.getObjectByName("rightArrow-outline");
      if (obj) obj.visible = showRightArrow && rightHoveredRef.current;
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
