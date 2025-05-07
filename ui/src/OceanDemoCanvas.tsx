import React, { useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import waterNormalsUrl from "./textures/waternormals.jpg?url";
import PostBox from "./PostBox";
import { Vector3 } from "three";

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
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 40;
    controls.maxDistance = 200;
    controls.target.set(0, 10, 0);
    controls.update();
    controlsRef.current = controls;
    return () => controls.dispose();
  }, [camera, gl.domElement]);

  useFrame((_, delta) => {
    if (waterRef.current) {
      (waterRef.current.material.uniforms as any).time.value += delta;
    }
    controlsRef.current?.update();
  });

  return <mesh></mesh>;
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
}

const OceanDemoCanvas: React.FC<OceanDemoCanvasProps> = ({
  posts,
  onPostClick,
  camera = new Vector3(0, 50, 200),
}) => (
  <Canvas camera={{ position: camera, fov: 60 }}>
    <ambientLight intensity={0.9} />
    <directionalLight position={[100, 100, 100]} intensity={1} />
    <OceanScene />
    {posts?.map((post, index) => (
      <PostBox
        key={post.id}
        title={post.title}
        position={[index * 100 - (posts.length - 1) * 10, 50, 0]}
        onClick={() => onPostClick?.(post.id)}
      />
    ))}
  </Canvas>
);

export default OceanDemoCanvas;
