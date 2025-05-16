import React, { useMemo, useRef } from "react";
import { useFrame, useLoader, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import sphereUrl from "./models/metalsphere.glb?url";
import fontJson from "./fonts/gentilis_regular.typeface.json";

interface FollowerSphereProps {
  offset: [number, number, number];
  onLeftClick?: () => void;
  onRightClick?: () => void;
}

const FollowerSphere: React.FC<FollowerSphereProps> = ({
  offset,
  onLeftClick,
  onRightClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();

  // 1. Load the sphere GLTF and the font once
  const gltf = useLoader(GLTFLoader, sphereUrl);
  const font = useMemo(() => new FontLoader().parse(fontJson), []);

  // Neon color constant
  const neonHex = 0x8c8e88;
  const neonColor = new THREE.Color(neonHex);

  // 2. Build a single group containing: glow shell, sphere, neon text, neon arrows + grey outlines
  const sphereWithTextGroup = useMemo(() => {
    const group = new THREE.Group();

    // --- Clone & style the sphere mesh ---
    const sphereClone = gltf.scenes[0].clone(true);
    sphereClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.metalness = 0.8;
        mat.roughness = 0.4;
        mat.color.setHex(0x222222);
      }
    });
    sphereClone.rotation.set(-3, 4, -1);

    // --- Compute bounding radius for glow shell ---
    let maxRadius = 0;
    sphereClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;
        if (!geom.boundingSphere) geom.computeBoundingSphere();
        maxRadius = Math.max(maxRadius, geom.boundingSphere!.radius);
      }
    });

    // --- Create the glow shell ---
    const glowGeo = new THREE.SphereGeometry(maxRadius * 0.7, 15, 15);
    const glowMat = new THREE.MeshBasicMaterial({
      color: neonColor,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(0, 0, 0);
    glowMesh.renderOrder = 0;

    // Ensure the sphereClone draws after the glow
    sphereClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).renderOrder = 1;
      }
    });

    // Add glow first, then sphere
    group.add(glowMesh);
    group.add(sphereClone);

    // --- Helper to add neon text/arrow with glow + solid pass ---
    const addNeon = (
      str: string,
      size: number,
      height: number,
      pos: [number, number, number],
      rot: [number, number, number],
      name: string
    ) => {
      // text geometry (depth replaces height)
      const geo = new TextGeometry(str, { font, size, height });

      // glow pass
      const glowMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.3,
        toneMapped: false,
      });
      const glowMesh = new THREE.Mesh(geo, glowMat);
      glowMesh.name = `${name}-glow`;
      glowMesh.position.set(...pos);
      glowMesh.rotation.set(...rot);
      glowMesh.scale.set(1.1, 1.1, 1.1);
      group.add(glowMesh);

      // solid pass
      const solidMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        toneMapped: false,
      });
      const solidMesh = new THREE.Mesh(geo, solidMat);
      solidMesh.name = name;
      solidMesh.position.set(...pos);
      solidMesh.rotation.set(...rot);
      group.add(solidMesh);

      return { geo, pos, rot, name };
    };

    // Add labels & arrows
    addNeon("1-10", 0.25, 0.08, [-1, 0.2, -0.4], [-1.1, -1, -1], "label");
    const leftParams = addNeon("<", 0.7, 2, [-1.8, 0, -1.55], [-1.4, -1.3, -1.2], "leftArrow");
    const rightParams = addNeon(
      ">",
      0.83,
      2,
      [1.6, 0.1, 1.2],
      [1.34, 1.34, 1.43],
      "rightArrow"
    );

    // --- Helper for grey outline behind an arrow ---
    const addGreyOutline = ({ geo, pos, rot }: ReturnType<typeof addNeon>) => {
      const greyMat = new THREE.MeshBasicMaterial({
        color: 0x00fff,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
      });
      const mesh = new THREE.Mesh(geo, greyMat);
      mesh.position.set(...pos);
      mesh.rotation.set(...rot);
      mesh.scale.set(1.2, 1.2, 1.2);
      group.add(mesh);
    };
    addGreyOutline(leftParams);
    addGreyOutline(rightParams);

    return group;
  }, [gltf, font, neonColor]);

  // 3. Follow the camera each frame
  useFrame(() => {
    if (groupRef.current) {
      const camPos = camera.position.clone().add(new THREE.Vector3(...offset));
      groupRef.current.position.copy(camPos);
    }
  });

  // Pointer event handlers
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const name = e.object.name;
    if (name === "leftArrow") onLeftClick?.();
    if (name === "rightArrow") onRightClick?.();
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (name === "leftArrow" || name === "rightArrow") {
      gl.domElement.style.cursor = "pointer";
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    const name = e.object.name;
    if (name === "leftArrow" || name === "rightArrow") {
      gl.domElement.style.cursor = "auto";
    }
  };

  return (
    <primitive
      ref={groupRef}
      object={sphereWithTextGroup}
      scale={[1.25, 1.25, 1.25]}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
};

export default FollowerSphere;
