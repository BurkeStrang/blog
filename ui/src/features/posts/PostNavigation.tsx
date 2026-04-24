import { useMemo, useRef, useEffect, useState } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { BufferGeometry, Vector3, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, Material, AdditiveBlending, BackSide, Object3D } from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import type { Font } from "three/examples/jsm/loaders/FontLoader";
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
  const groupRef = useRef<Group>(null);
  const { camera, gl } = useThree();
  const [leftArrowHovered, setLeftArrowHovered] = useState(false);
  const [rightArrowHovered, setRightArrowHovered] = useState(false);
  const leftOutlineRef = useRef<Mesh | null>(null);
  const rightOutlineRef = useRef<Mesh | null>(null);
  const colors = isDark ? DARK_SCENE_THEME : LIGHT_SCENE_THEME;

  // 1) Pre-build TextGeometries
  const labelText = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    if (totalPosts === 0) return '00-00';
    const startPost = totalPosts <= 10 ? 1 : (currentPage - 1) * 10 + 1;
    const endPost = Math.min(currentPage * 10, totalPosts);
    return `${pad(startPost)}-${pad(endPost)}`;
  }, [currentPage, totalPosts]);

  // Cache TextGeometry instances to prevent recreation on every page change
const labelGeo = useMemo(
    () => {
    // Create new TextGeometry for label
      const geo = new TextGeometry(labelText, {
        font,
        size: 0.25,
        depth: 0.08, // use `depth` not `height`
      });
      
      // Register with asset disposal manager
      if (typeof window !== 'undefined') {
        const windowWithAssetManager = window as Window & { assetDisposalManager?: { registerAsset: (id: string, asset: BufferGeometry, priority: string) => void } };
        if (windowWithAssetManager.assetDisposalManager) {
          windowWithAssetManager.assetDisposalManager.registerAsset(
            `nav-label-${labelText}`,
            geo,
            'low'
          );
        }
      }
      
      return geo;
    },
  [font, labelText],
);

// Dispose previous label geometry when labelText changes to prevent memory leaks
useEffect(() => {
  return () => {
    labelGeo.dispose();
    if (typeof window !== 'undefined') {
      const windowWithAssetManager = window as Window & { assetDisposalManager?: { unregisterAsset: (id: string) => void } };
      windowWithAssetManager.assetDisposalManager?.unregisterAsset(`nav-label-${labelText}`);
    }
  };
}, [labelGeo, labelText]);
  const leftGeo = useMemo(
    () => {
      const geo = new TextGeometry("<", {
        font,
        size: 0.78,
        depth: 0.25,
      });
      return geo;
    },
    [font],
  );
  const rightGeo = useMemo(
    () => {
      const geo = new TextGeometry(">", {
        font,
        size: 0.84,
        depth: 0.25,
      });
      return geo;
    },
    [font],
  );

  // 2) Pre-build Materials
  const primaryGlowMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: colors.accentColor,
        blending: AdditiveBlending,
        transparent: true,
        opacity: 0.3,
        toneMapped: false,
      }),
    [isDark],
  );
  const primarySolidMat = useMemo(
    () => new MeshStandardMaterial({
      color: colors.accentColor,
      emissive: isDark ? 0x006666 : 0x000000,
      emissiveIntensity: isDark ? 2.0 : 0,
      roughness: 0.4,
      metalness: 0.1,
    }),
    [isDark],
  );
  const greyOutlineMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: colors.accentColor,
        blending: AdditiveBlending,
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
      }),
    [isDark],
  );
  const brightOutlineMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: colors.accentColor,
        blending: AdditiveBlending,
        transparent: true,
        opacity: 0.7,
        toneMapped: false,
      }),
    [isDark],
  );
  const greenOutlineMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: colors.sphereArrowAccentColor,
        blending: AdditiveBlending,
        transparent: true,
        opacity: 1,
        toneMapped: false,
      }),
    [isDark],
  );


  // 3) Compute glow-shell geometry & material  
  const [glowShellGeo, glowShellMat] = useMemo(() => {
    let maxRadius = 0;
    sphereModel.scene.traverse((child) => {
      if (child instanceof Mesh) {
        const geom = child.geometry as BufferGeometry;
        if (!geom.boundingSphere) geom.computeBoundingSphere();
        maxRadius = Math.max(maxRadius, geom.boundingSphere!.radius);
      }
    });
    const geo = new SphereGeometry(maxRadius * 0.7, 12, 12);
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

  // 4) Create stable sphere group (only sphere and glow shell)
  const sphereGroup = useMemo(() => {
    const group = new Group();

    // glow shell
    const shell = new Mesh(glowShellGeo, glowShellMat);
    shell.renderOrder = 0;
    group.add(shell);

    // sphere clone (reuse buffers)
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

  // 4b) Update sphere body and glow shell reactively when theme changes
  useEffect(() => {
    glowShellMat.color.setHex(colors.sphereGlowColor);
    glowShellMat.opacity = colors.sphereGlowOpacity;

    sphereGroup.traverse((child: Object3D) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as MeshStandardMaterial;
      if (mat && mat.isMeshStandardMaterial) {
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

  // 5) Update text elements dynamically
  useEffect(() => {
    // Remove existing text meshes
    const textMeshesToRemove = sphereGroup.children.filter(child =>
      child instanceof Mesh &&
      (child.geometry instanceof TextGeometry || child.name?.includes('Arrow') || child.name?.includes('label') || child.name?.includes('hitbox'))
    );
    textMeshesToRemove.forEach(mesh => {
      sphereGroup.remove(mesh);
      if (mesh instanceof Mesh) {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material && !Array.isArray(mesh.material)) mesh.material.dispose();
      }
    });

    // helper to add text/arrow meshes
    const addMesh = (
      geo: TextGeometry,
      mat: Material,
      pos: [number, number, number],
      rot: [number, number, number],
      scale: number = 1,
      name?: string,
      visible: boolean = true,
    ) => {
      const mesh = new Mesh(geo, mat);
      if (name) mesh.name = name;
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(scale, scale, scale);
      mesh.visible = visible;
      sphereGroup.add(mesh);
      return mesh;
    };

    // helper to add invisible hitbox for larger click area
    const addHitbox = (
      pos: [number, number, number],
      size: number,
      name: string,
    ) => {
      const hitboxGeo = new SphereGeometry(size, 8, 8);
      const hitboxMat = new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        visible: false, // Invisible but still captures pointer events
      });
      const hitbox = new Mesh(hitboxGeo, hitboxMat);
      hitbox.name = name;
      hitbox.position.set(...pos);
      sphereGroup.add(hitbox);
    };

    // label (no glow effect)
    addMesh(labelGeo, primarySolidMat, [-1.55, 0.2, 1], [-1.1, -1.05, -0.85], 1, 'label-solid');

    // left arrow + outline (conditional)
    if (showLeftArrow) {
      // Primary color outline (store in ref, initially hidden)
      // addMesh(
      //   leftGeo,
      //   brightOutlineMat,
      //   [-1.4, -0.27, -1.29],
      //   [-1.43, -1.17, -1.22],
      //   1.1,
      //   "leftArrow-outline",
      // );

      addMesh(
        leftGeo,
        greenOutlineMat,
        [-1.4, -0.27, -1.29],
        [-1.43, -1.17, -1.22],
        1.0,
        "leftArrow-outline-nohover",
      );
      // Main arrow
      addMesh(
        leftGeo,
        greyOutlineMat,
        [-1.4, -0.27, -1.29],
        [-1.43, -1.17, -1.22],
        1.0,
        "leftArrow",
      );
      // Add larger invisible hitbox for easier clicking
      addHitbox([-1.5, -0.27, -1.59], 1.5, "leftArrow-hitbox");
    }

    // right arrow + outline (conditional)
    if (showRightArrow) {
      // Primary color outline (store in ref, initially hidden)
      // addMesh(
      //   rightGeo,
      //   brightOutlineMat,
      //   [1.8, 0.1, 0.5],
      //   [1.43, 1.37, 1.42],
      //   1.0,
      //   "rightArrow",
      // );

      addMesh(
        rightGeo,
        greenOutlineMat,
        [1.9, 0.1, 0.5],
        [1.43, 1.27, 1.42],
        1.0,
        "rightArrow",
      );
      // Main arrow
      addMesh(
        rightGeo,
        greyOutlineMat,
        [1.9, 0.1, 0.5],
        [1.43, 1.27, 1.42],
        1.1,
        "rightArrow",
      );
      // Add larger invisible hitbox for easier clicking
      addHitbox([1.9, 0.1, 0.5], 1.5, "rightArrow-hitbox");
    }
  }, [
    sphereGroup,
    labelGeo,
    leftGeo,
    rightGeo,
    primarySolidMat,
    greyOutlineMat,
    brightOutlineMat,
    showLeftArrow,
    showRightArrow,
  ]);

  // Update outline visibility based on hover state
  useEffect(() => {
    if (leftOutlineRef.current) {
      leftOutlineRef.current.visible = leftArrowHovered;
    }
  }, [leftArrowHovered]);

  useEffect(() => {
    if (rightOutlineRef.current) {
      rightOutlineRef.current.visible = rightArrowHovered;
    }
  }, [rightArrowHovered]);

  // follow camera
  useFrame(() => {
    if (groupRef.current) {
      const camPos = camera.position.clone().add(new Vector3(...offset));
      // Move sphere slightly to the right
      camPos.x += 1.5;
      groupRef.current.position.copy(camPos);
    }
  });

  // pointer events
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const name = e.object.name;
    if (name === "leftArrow" || name === "leftArrow-hitbox") {
      onLeftClick?.();
    }
    if (name === "rightArrow" || name === "rightArrow-hitbox") {
      onRightClick?.();
    }
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (name === "leftArrow" || name === "leftArrow-hitbox") {
      setLeftArrowHovered(true);
      if (gl.domElement) {
        gl.domElement.style.setProperty('cursor', 'pointer');
      }
    }
    if (name === "rightArrow" || name === "rightArrow-hitbox") {
      setRightArrowHovered(true);
      if (gl.domElement) {
        gl.domElement.style.setProperty('cursor', 'pointer');
      }
    }
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (name === "leftArrow" || name === "leftArrow-hitbox") {
      setLeftArrowHovered(false);
      if (gl.domElement) {
        gl.domElement.style.setProperty('cursor', 'auto');
      }
    }
    if (name === "rightArrow" || name === "rightArrow-hitbox") {
      setRightArrowHovered(false);
      if (gl.domElement) {
        gl.domElement.style.setProperty('cursor', 'auto');
      }
    }
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      // Unregister geometries from asset disposal manager
      if (typeof window !== 'undefined') {
        const windowWithAssetManager = window as Window & { assetDisposalManager?: { unregisterAsset: (id: string) => void } };
        if (windowWithAssetManager.assetDisposalManager) {
          windowWithAssetManager.assetDisposalManager.unregisterAsset(`nav-label-${labelText}`);
        }
      }
      
      labelGeo.dispose();
      leftGeo.dispose();
      rightGeo.dispose();
      glowShellGeo.dispose();
      primaryGlowMat.dispose();
      primarySolidMat.dispose();
      greyOutlineMat.dispose();
      glowShellMat.dispose();
      
      // Reset cursor on unmount to prevent stuck cursor states
      if (gl.domElement) {
        gl.domElement.style.setProperty('cursor', 'auto');
      }
    };
  }, [
    labelGeo,
    leftGeo,
    rightGeo,
    glowShellGeo,
    primaryGlowMat,
    primarySolidMat,
    greyOutlineMat,
    glowShellMat,
    labelText,
    gl.domElement,
  ]);

  return (
    <group ref={groupRef} scale={[3, 3, 3]}>
      <primitive 
        object={sphereGroup}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    </group>
  );
}
