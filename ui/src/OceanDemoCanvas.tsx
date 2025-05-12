import React, { useRef, useEffect } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import waterNormalsUrl from "./textures/waternormals.jpg?url";
import cloudTextureUrl from "./textures/sunsethorizon.jpg?url";
import PostBox from "./PostBox";
import { Vector3 } from "three";
import { ScrollCamera } from "./ScrollCamera";

const OceanScene: React.FC = () => {
  const { scene, gl, camera } = useThree();
  const waterRef = useRef<Water>();
  const controlsRef = useRef<OrbitControls>();

  useEffect(() => {
    const waterNormals = new THREE.TextureLoader().load(
      waterNormalsUrl,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      },
    );

    const geo = new THREE.PlaneGeometry(10000, 10000);
    const water = new Water(geo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new THREE.Vector3(),
      sunColor: 0x999,
      waterColor: 0x431,
      distortionScale: 3.7,
      fog: scene.fog !== undefined,
    });
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    waterRef.current = water;

    return () => {
      scene.remove(water);
      geo.dispose();
      water.material.dispose();
    };
  }, [scene, gl]);

  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    // controls.maxPolarAngle = Math.PI * 0.495;
    // controls.minDistance = -1000000;
    // controls.maxDistance = 1000000;
    controls.target.set(0, 10, 0);
    controls.update();
    controlsRef.current = controls;

    // Log camera position on change
    const handleChange = () => {
      console.log(
        `Camera position: x=${camera.position.x}, y=${camera.position.y}, z=${camera.position.z}`,
      );
    };
    controls.addEventListener("change", handleChange);

    return () => {
      controls.removeEventListener("change", handleChange);
      controls.dispose();
    };
  }, [camera, gl.domElement]);

  useFrame((_, delta) => {
    if (waterRef.current) {
      (waterRef.current.material.uniforms as any).time.value += delta;
    }
    controlsRef.current?.update();
  });

  return null;
};

const CloudBackground: React.FC = () => {
  // load the texture
  const tex = useLoader(THREE.TextureLoader, cloudTextureUrl);
  return <primitive attach="background" object={tex} />;
};

interface Post {
  id: string;
  title: string;
  body: string;
}

interface OceanDemoCanvasProps {
  camera?: Vector3;
  posts?: Post[];
  onPostClick?: (postId: string) => void;
  onLoaded?: () => void;
}

const OceanDemoCanvas: React.FC<OceanDemoCanvasProps> = ({
  posts,
  onPostClick,
  camera,
  onLoaded,
}) => (
  <>
    <Canvas
      camera={{ position: camera, fov: 60 }}
      onCreated={() => {
        // once three.js context is ready, notify parent
        onLoaded?.();
      }}
    >
      <CloudBackground />
      <ambientLight intensity={0.9} />
      <directionalLight position={[500, 300, 0]} intensity={1} />

      <OceanScene />
      <ScrollCamera
        // this is the destination the start is in App.tsx
        start={new Vector3(-460, 20, 119)}
        end={new Vector3(-600, 10, 100)} // this dosen't do anything
        lerpFactor={0.08}
      />

      {posts?.map((post, index) => {
        const x = index * 50 - (posts.length - 1) * 50;
        const y = 30;
        const z = index * 40;

        return (
          <PostBox
            key={post.id}
            index={index}
            title={post.title}
            position={[x, y, z]}
            onClick={() => onPostClick?.(post.id)}
          />
        );
      })}
    </Canvas>
  </>
);

export default OceanDemoCanvas;
