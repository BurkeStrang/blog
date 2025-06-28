import { useMemo, useRef, useEffect } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import type { Font } from "three/examples/jsm/loaders/FontLoader";

// Neon color constant
const neonHex = 0x8c8e88;
const neonColor = new THREE.Color(neonHex);

interface FollowerSphereProps {
  offset: [number, number, number];
  onLeftClick?: () => void;
  onRightClick?: () => void;
  sphereModel: GLTF;
  font: Font;
}

export default function FollowerSphere({
  offset,
  onLeftClick,
  onRightClick,
  sphereModel,
  font,
}: FollowerSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  // 1) Pre-build TextGeometries
  const labelGeo = useMemo(
    () =>
      new TextGeometry("1-10", {
        font,
        size: 0.25,
        depth: 0.08, // use `depth` not `height`
      }),
    [font],
  );
  const leftGeo = useMemo(
    () =>
      new TextGeometry("<", {
        font,
        size: 0.78,
        depth: 0.5,
      }),
    [font],
  );
  const rightGeo = useMemo(
    () =>
      new TextGeometry(">", {
        font,
        size: 0.84,
        depth: 0.5,
      }),
    [font],
  );

  // 2) Pre-build Materials
  const neonGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: neonColor,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.3,
        toneMapped: false,
      }),
    [],
  );
  const neonSolidMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: neonColor, toneMapped: false }),
    [],
  );
  const greyOutlineMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
      }),
    [],
  );

  // 3) Compute glow-shell geometry & material
  const [glowShellGeo, glowShellMat] = useMemo(() => {
    let maxRadius = 0;
    sphereModel.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geom = child.geometry as THREE.BufferGeometry;
        if (!geom.boundingSphere) geom.computeBoundingSphere();
        maxRadius = Math.max(maxRadius, geom.boundingSphere!.radius);
      }
    });
    const geo = new THREE.SphereGeometry(maxRadius * 0.7, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: neonColor,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return [geo, mat] as const;
  }, [sphereModel]);

  // 4) Build scene group
  const sphereGroup = useMemo(() => {
    const group = new THREE.Group();

    // glow shell
    const shell = new THREE.Mesh(glowShellGeo, glowShellMat);
    shell.renderOrder = 0;
    group.add(shell);

    // sphere clone (reuse buffers)
    const sphereClone = sphereModel.scene.clone(true);
    sphereClone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = (child.material as THREE.MeshStandardMaterial).clone();
        mat.metalness = 0.8;
        mat.roughness = 0.4;
        mat.color.setHex(0x222222);
        child.material = mat;
        child.renderOrder = 1;
      }
    });
    sphereClone.rotation.set(1, -1, 0);
    group.add(sphereClone);

    // helper to add text/arrow meshes
    const addMesh = (
      geo: TextGeometry,
      mat: THREE.Material,
      pos: [number, number, number],
      rot: [number, number, number],
      scale: number = 1,
      name?: string,
    ) => {
      const mesh = new THREE.Mesh(geo, mat);
      if (name) mesh.name = name;
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(scale, scale, scale);
      group.add(mesh);
    };

    // label
    addMesh(labelGeo, neonGlowMat, [-1.5, 0.3, 1], [-1, -1, -0.8], 1.1);
    addMesh(labelGeo, neonSolidMat, [-1.5, 0.3, 1], [-1, -1, -0.8], 1);

    // left arrow + outline
    // addMesh(leftGeo, neonGlowMat, [-2, 0, -1.59], [-1.9, -1.32, -1.2], 1.1);
    addMesh(
      leftGeo,
      greyOutlineMat,
      [-1.5, -0.27, -1.59],
      [-1.41, -1.1, -1.24],
      1.2,
      "leftArrow",
    );

    // right arrow + outline
    // addMesh(rightGeo, neonGlowMat, [1.6, 0.1, 1.2], [1.34, 1.35, 1.5], 1.1);
    addMesh(
      rightGeo,
      greyOutlineMat,
      [1.9, 0.1, 0.5],
      [1.34, 1.35, 1.5],
      1.2,
      "rightArrow",
    );

    return group;
  }, [
    sphereModel,
    labelGeo,
    leftGeo,
    rightGeo,
    neonGlowMat,
    neonSolidMat,
    greyOutlineMat,
    glowShellGeo,
    glowShellMat,
  ]);

  // follow camera
  useFrame(() => {
    if (groupRef.current) {
      const camPos = camera.position.clone().add(new THREE.Vector3(...offset));
      groupRef.current.position.copy(camPos);
    }
  });

  // pointer events
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const name = e.object.name;
    if (name === "leftArrow") onLeftClick?.();
    if (name === "rightArrow") onRightClick?.();
  };
  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.name.endsWith("Arrow"))
      gl.domElement.style.cursor = "pointer";
  };
  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    if (e.object.name.endsWith("Arrow"))
      gl.domElement.style.cursor = "auto";
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      labelGeo.dispose();
      leftGeo.dispose();
      rightGeo.dispose();
      glowShellGeo.dispose();
      neonGlowMat.dispose();
      neonSolidMat.dispose();
      greyOutlineMat.dispose();
      glowShellMat.dispose();
      
      // Reset cursor on unmount to prevent stuck cursor states
      gl.domElement.style.cursor = "auto";
    };
  }, [
    labelGeo,
    leftGeo,
    rightGeo,
    glowShellGeo,
    neonGlowMat,
    neonSolidMat,
    greyOutlineMat,
    glowShellMat,
    gl.domElement,
  ]);

  return (
    <primitive
      ref={groupRef}
      object={sphereGroup}
      scale={[3, 3, 3]}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}
