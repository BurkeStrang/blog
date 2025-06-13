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

const NO_TONE_MAPPING = 0;
const LINEAR_ENCODING = 3000;

// Optimized Ocean Scene
const OceanScene: React.FC = () => {
  const { scene } = useThree();
  const waterRef = useRef<Water>(null!);

  // Load water normals only once and set wrapping
  const waterNormals = useLoader(TextureLoader, waterNormalsUrl);
  useEffect(() => {
    waterNormals.wrapS = waterNormals.wrapT = RepeatWrapping;
  }, [waterNormals]);

  useEffect(() => {
    // Only set fog once
    scene.fog = new FogExp2(0x2a2a38, 0.0009);

    // Geometry: minimal segments for best performance
    const geo = new PlaneGeometry(10000, 10000, 1, 1);
    const water = new Water(geo, {
      textureWidth: 256,
      textureHeight: 256,
      waterNormals,
      sunColor: 0x00000f,
      waterColor: 0x111111,
      distortionScale: 3.7,
      fog: Boolean(scene.fog),
    });

    // Material setup (transparency, glow, etc.)
    water.material.transparent = true;
    water.material.uniforms.alpha.value = 0.99;
    water.material.opacity = 0.99;
    water.material.uniforms.waterColor.value.set(0x00000f);
    water.material.uniforms.distortionScale.value = 0.5;
    water.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <color_fragment>`,
        `#include <color_fragment>;
         // Bioluminescent glow
         gl_FragColor.rgb += vec3(0.4, 0.4, 0.4) * pow(dot(gl_FragColor.rgb, vec3(1.0)), 2.0);
        `
      );
    };
    water.rotation.x = -Math.PI / 2;
    scene.add(water);
    waterRef.current = water;

    return () => {
      scene.remove(water);
      geo.dispose();
      water.material.dispose();
    };
  }, [scene, waterNormals]);

  useFrame((_, delta) => {
    if (waterRef.current) {
      const mat = waterRef.current.material as ShaderMaterial & {
        uniforms: { time: { value: number } };
      };
      mat.uniforms.time.value += delta;
    }
  });

  return null;
};

// Background: only set background once for performance
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
  // Positions memoized for efficiency
  const positions = useMemo(
    () =>
      posts.map(
        (_, i) => new Vector3(i * 50 - (posts.length - 1) * 25, -8.5, i * 40)
      ),
    [posts]
  );
  const offsetPositions = useMemo(
    () => positions.map((p) => p.clone().add(new Vector3(-100, 30, 100))),
    [positions]
  );
  const startPos = useMemo(
    () => offsetPositions[0].clone().add(new Vector3(-100, 0, 300)),
    [offsetPositions]
  );

  // Renderer config: linear, transparent, output encoding, clear color
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
      shadows={false}
    >
      {/* Scene content */}
      <CloudBackground />
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
          luminanceSmoothing={0.2}  // slightly lower for more efficiency
          intensity={0.8}           // slightly reduced
        />
      </EffectComposer>
    </Canvas>
  );
};

export default OceanDemoCanvas;
