import React, { useRef, useEffect } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water.js";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ScrollCamera } from "./ScrollCamera";
import PostBox from "./PostBox";
import waterNormalsUrl from "./textures/waternormals.jpg?url";
import cloudTextureUrl from "./textures/darktheme.JPG?url";
import { Vector3 } from "three";
import { Post } from "./App";

const OceanScene: React.FC = () => {
  const { scene } = useThree();
  const waterRef = useRef<Water>();

  // create water once
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
      sunColor: 0x999999,
      waterColor: 0x001e0f,
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
  }, [scene]);

  // attach orbit controls once
  // useEffect(() => {
  //   const controls = new OrbitControls(camera, gl.domElement);
  //   controls.minDistance = 10;
  //   controls.maxDistance = 500;
  //   controls.target.set(0, 0, 0);
  //   controls.update();
  //   return () => {
  //     controls.dispose();
  //   };
  // }, [camera, gl.domElement]);

  // advance water time on each frame
  useFrame((_, delta) => {
    if (waterRef.current) {
      (waterRef.current.material.uniforms as any).time.value += delta;
    }
  });

  // add a metallic sphere hovering above the water at the origin
  return (
    <mesh position={[-230, 6, 130]}>
      <sphereGeometry args={[3, 28, 28]} />
      <meshStandardMaterial color={0x101937} metalness={0.8} roughness={0.6} />
    </mesh>
  );
};

const CloudBackground: React.FC = () => {
  const texture = useLoader(THREE.TextureLoader, cloudTextureUrl);
  return <primitive attach="background" object={texture} />;
};

interface OceanDemoCanvasProps {
  posts: Post[];
  onPostClick?: (postSlug: string) => void;
  onLoaded?: () => void;
}

const OceanDemoCanvas: React.FC<OceanDemoCanvasProps> = ({
  posts,
  onPostClick,
  onLoaded,
}) => {
  // build two parallel arrays of Vector3 targets
  const positions = React.useMemo(() => {
    return posts.map((_, i) => {
      const x = i * 50 - (posts.length - 1) * 25;
      const y = -8.5;
      const z = i * 40;
      return new Vector3(x, y, z);
    });
  }, [posts]);

  const offsetPositions = positions.map((pos, index) =>
    pos.clone().add(new THREE.Vector3(-100, 30, 100)),
  );

  const startPosition = offsetPositions[0]
    .clone()
    .add(new THREE.Vector3(-300, 0, 300));

  return (
    <Canvas
      camera={{ position: startPosition.toArray(), fov: 73 }}
      onCreated={() => onLoaded?.()}
    >
      <CloudBackground />
      <ambientLight intensity={0.9} />
      <directionalLight position={[500, 300, 0]} intensity={1} />

      <OceanScene />

      {posts.map((post, i) => {
        const pos = positions[i];
        return (
          <PostBox
            key={post.slug}
            index={i}
            title={post.title}
            position={[pos.x, pos.y, pos.z]}
            onClick={() => onPostClick?.(post.slug)}
          />
        );
      })}

      <ScrollCamera positions={offsetPositions} lerpFactor={0.08} stepSize={1} />
    </Canvas>
  );
};

export default OceanDemoCanvas;
