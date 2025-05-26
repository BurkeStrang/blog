import React, { useEffect, useRef, useMemo } from "react";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import {
  TextureLoader,
  RepeatWrapping,
  PlaneGeometry,
  Vector3,
  ShaderMaterial,
  WebGLRenderer,
  FogExp2,
} from "three";
import { Water } from "three/examples/jsm/objects/Water";
import ScrollCamera from "./ScrollCamera";
import PostBox from "./PostBox";
import FollowerSphere from "./FollowerSphere";
import waterNormalsUrl from "./textures/waternormals.jpg?url";
import cloudTextureUrl from "./textures/waterbackground.png?url";
import type { Post } from "./AppContent";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

// TypeScript augmentation for outputEncoding
declare module "three" {
  interface WebGLRenderer {
    outputEncoding: number;
  }
}

// Rendering constants
const NO_TONE_MAPPING = 0;
const LINEAR_ENCODING = 3000;

// Night-time lighting setup
const NightLights: React.FC = () => (
  <>
    <ambientLight color={0x08081a} intensity={0.1} />
    <directionalLight
      color={0x000000}
      intensity={0.3}
      position={[-500, 800, -830]}
      castShadow={true}
    />
    {/* <pointLight args={[0x112233, 0.1, 200]} position={[1000, -30, 100]} /> */}
    {/* <pointLight args={[0x223344, 0.05, 150]} position={[1000, 2000, 60]} /> */}
  </>
);

// Ocean scene with bioluminescent water
const OceanScene: React.FC = () => {
  const { scene } = useThree();
  const waterRef = useRef<Water>(null!);
  scene.fog = new FogExp2(0x2a2a38, 0.0009); // more grey, dark grey-purple color
  useEffect(() => {
    // Load normals texture
    const normals = new TextureLoader().load(waterNormalsUrl, (t) => {
      t.wrapS = t.wrapT = RepeatWrapping;
    });

    // Base geometry + water
    const geo = new PlaneGeometry(10000, 10000);
    const water = new Water(geo, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunColor: 0x00000f,
      waterColor: 0x111111,
      distortionScale: 3.7,
      fog: Boolean(scene.fog),
    });
    water.material.transparent = true; // enable transparency
    water.material.uniforms.alpha.value = 0.99; // 1.0 = fully opaque, 0.0 = fully invisible
    water.material.opacity = 0.99;

    // Bioluminescent tweaks
    water.material.uniforms.waterColor.value.set(0x00000f);
    water.material.uniforms.distortionScale.value = 0.5;
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>;
         // add glow
         gl_FragColor.rgb += vec3(0.4, 0.4, 0.4) * pow(dot(gl_FragColor.rgb, vec3(1.0)), 2.0);
        `,
      );
    };

    // Orient & add to scene
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    waterRef.current = water;

    return () => {
      scene.remove(water);
      geo.dispose();
      water.material.dispose();
    };
  }, [scene]);

  useFrame((_, delta) => {
    const mat = waterRef.current.material as ShaderMaterial & {
      uniforms: { time: { value: number } };
    };
    mat.uniforms.time.value += delta;
  });

  return null;
};

const CloudBackground: React.FC = () => {
  const texture = useLoader(TextureLoader, cloudTextureUrl);
  const { scene } = useThree();
  useEffect(() => {
    scene.background = texture;
  }, [scene, texture]);
  return null;
};

interface OceanDemoCanvasProps {
  posts: Post[];
  onPostClick?: (slug: string) => void;
  onLoaded?: () => void;
}

const OceanDemoCanvas: React.FC<OceanDemoCanvasProps> = ({
  posts,
  onPostClick,
  onLoaded,
}) => {
  // Compute positions once
  const positions = useMemo(
    () =>
      posts.map(
        (_, i) => new Vector3(i * 50 - (posts.length - 1) * 25, -8.5, i * 40),
      ),
    [posts],
  );
  const offsetPositions = positions.map((p) =>
    p.clone().add(new Vector3(-100, 30, 100)),
  );
  const startPos = offsetPositions[0].clone().add(new Vector3(-100, 0, 300));

  // Renderer config: linear, transparent
  const handleCreated = ({ gl }: { gl: WebGLRenderer }) => {
    gl.toneMapping = NO_TONE_MAPPING;
    gl.outputEncoding = LINEAR_ENCODING;
    gl.setClearColor(0x000000, 0);
  };

  return (
    <Canvas
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
      linear
      onCreated={(state) => {
        handleCreated(state);
        onLoaded?.();
      }}
      camera={{ position: startPos.toArray(), fov: 73 }}
    >
      {/* Scene content */}
      <CloudBackground />
      <NightLights />
      <OceanScene />
      <FollowerSphere
        offset={[27, -8, 0]}
        onLeftClick={() => console.log("Left click")}
        onRightClick={() => console.log("Right click")}
      />
      {posts.map((post, i) => {
        const p = positions[i];
        return (
          <PostBox
            key={post.slug}
            index={i}
            title={post.title}
            position={[p.x, p.y, p.z]}
            onClick={() => onPostClick?.(post.slug)}
          />
        );
      })}
      <ScrollCamera
        positions={offsetPositions}
        lerpFactor={0.08}
        stepSize={1}
      />

      {/* Bioluminescent bloom effect */}
      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0}
          luminanceSmoothing={0.3}
          intensity={1.0}
        />
      </EffectComposer>
    </Canvas>
  );
};

export default OceanDemoCanvas;
