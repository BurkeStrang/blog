import React, { useEffect, useRef, useMemo, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  PlaneGeometry,
  Vector3,
  ShaderMaterial,
  WebGLRenderer,
  FogExp2,
  Texture,
} from "three";
import { Water } from "three/examples/jsm/objects/Water";
import ScrollCamera from "./ScrollCamera";
import PostBox from "./PostBox";
import FollowerSphere from "./FollowerSphere";
import type { Post } from "./AppContent";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { memoryMonitor } from "./utils/textureOptimizer";
import { GeometryPool, lodManager } from "./utils/lodManager";

// TypeScript augmentation for outputEncoding
declare module "three" {
  interface WebGLRenderer {
    outputEncoding: number;
  }
}

const NO_TONE_MAPPING = 0;
const LINEAR_ENCODING = 3000;

interface PerformanceMode {
  isLowEnd: boolean;
  textureQuality: string;
  particleCount: number;
  enableBloom: boolean;
}

// Memory-optimized Ocean Scene with preloaded resources
const OceanScene: React.FC<{ waterNormals: Texture; performanceMode: PerformanceMode }> = ({ 
  waterNormals, 
  performanceMode 
}) => {
  const { scene } = useThree();
  const waterRef = useRef<Water>(null!);

  useEffect(() => {
    // Only set fog once
    scene.fog = new FogExp2(0x2a2a38, 0.0009);

    // Adaptive geometry based on performance
    const segments = performanceMode.isLowEnd ? 1 : 2;
    const textureSize = performanceMode.isLowEnd ? 128 : 256;
    
    // Use geometry pool for memory efficiency
    const geo = GeometryPool.getGeometry(
      `water-${segments}`,
      () => new PlaneGeometry(10000, 10000, segments, segments)
    );
    
    const water = new Water(geo, {
      textureWidth: textureSize,
      textureHeight: textureSize,
      waterNormals,
      sunColor: 0x00000f,
      waterColor: 0x111111,
      distortionScale: performanceMode.isLowEnd ? 1.5 : 3.7,
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

    // LOD setup for water based on camera distance
    lodManager.addLODObject('water', new Vector3(0, 0, 0), [
      { distance: 1000, object: water },
      { distance: 5000, object: water }
    ]);

    return () => {
      scene.remove(water);
      GeometryPool.releaseGeometry(geo);
      water.material.dispose();
    };
  }, [scene, waterNormals, performanceMode]);

  useFrame((_, delta) => {
    if (waterRef.current) {
      const mat = waterRef.current.material as ShaderMaterial & {
        uniforms: { time: { value: number } };
      };
      mat.uniforms.time.value += delta;
    }
    
    // Update LOD system
    lodManager.update();
  });

  return null;
};

// Background: use preloaded texture
const CloudBackground: React.FC<{ texture: Texture }> = ({ texture }) => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = texture;
  }, [scene, texture]);
  return null;
};

interface ResourceCache {
  textures: {
    waterNormals?: Texture;
    cloudBackground?: Texture;
  };
  models: {
    sphere?: import('three/examples/jsm/loaders/GLTFLoader').GLTF;
    rubiksCube?: import('three/examples/jsm/loaders/GLTFLoader').GLTF;
  };
  fonts: {
    gentilis?: import('three/examples/jsm/loaders/FontLoader').Font;
  };
}

interface OceanDemoCanvasProps {
  posts: Post[];
  onPostClick?: (slug: string) => void;
  resources: ResourceCache;
  onLoaded?: () => void;
  isPaused?: boolean;
}

const OceanDemoCanvas: React.FC<OceanDemoCanvasProps> = ({
  posts,
  onPostClick,
  resources,
  isPaused = false,
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

  // Track when scene is fully loaded
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [postBoxesLoaded, setPostBoxesLoaded] = useState(0);
  
  // Memory optimization
  const performanceMode = useMemo(() => {
    // Detect device capabilities for adaptive quality
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4; // GB
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    return {
      isLowEnd: deviceMemory < 4 || hardwareConcurrency < 4,
      textureQuality: deviceMemory < 4 ? 'low' : deviceMemory < 8 ? 'medium' : 'high',
      particleCount: deviceMemory < 4 ? 50 : 100,
      enableBloom: deviceMemory >= 4
    };
  }, []);
  
  // Call onLoaded when everything is ready
  useEffect(() => {
    if (sceneLoaded && postBoxesLoaded >= posts.length && onLoaded) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        onLoaded();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sceneLoaded, postBoxesLoaded, posts.length, onLoaded]);
  
  // Renderer config with memory optimization
  const handleCreated = ({ gl }: { gl: WebGLRenderer }) => {
    gl.toneMapping = NO_TONE_MAPPING;
    gl.outputEncoding = LINEAR_ENCODING;
    gl.setClearColor(0x000000, 0);
    
    // Configure renderer for memory efficiency
    gl.setPixelRatio(Math.min(window.devicePixelRatio, performanceMode.isLowEnd ? 1.5 : 2));
    
    // Set up memory monitoring
    memoryMonitor.setRenderer(gl);
    
    // Mark scene as loaded after a frame
    const frameId = requestAnimationFrame(() => {
      setSceneLoaded(true);
      memoryMonitor.logMemoryUsage();
    });
    
    // Store frameId for cleanup (though this is unlikely to be needed)
    return () => {
      cancelAnimationFrame(frameId);
    };
  };
  
  // Early return if resources aren't ready
  if (
    !resources.textures.waterNormals ||
    !resources.textures.cloudBackground ||
    !resources.models.sphere ||
    !resources.models.rubiksCube ||
    !resources.fonts.gentilis
  ) {
    return null;
  }

  return (
    <Canvas
      linear
      frameloop={isPaused ? "never" : "always"}
      onCreated={handleCreated}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: sceneLoaded && postBoxesLoaded >= posts.length ? 1 : 0,
        /* No transition for instant response */
      }}
      camera={{ position: startPos.toArray(), fov: 73 }}
      shadows={false}
    >
      {/* Scene content */}
      <CloudBackground texture={resources.textures.cloudBackground!} />
      <OceanScene 
        waterNormals={resources.textures.waterNormals!} 
        performanceMode={performanceMode}
      />
      <FollowerSphere
        offset={[27, -8, 0]}
        onLeftClick={() => console.log("Left click")}
        onRightClick={() => console.log("Right click")}
        sphereModel={resources.models.sphere!}
        font={resources.fonts.gentilis!}
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
            rubiksCubeModel={resources.models.rubiksCube!}
            font={resources.fonts.gentilis!}
            onReady={() => setPostBoxesLoaded(prev => prev + 1)}
          />
        );
      })}
      <ScrollCamera
        positions={offsetPositions}
        lerpFactor={0.08}
        stepSize={1}
      />

      {/* Conditional bloom effect based on device capability */}
      {performanceMode.enableBloom && (
        <EffectComposer 
          enableNormalPass={false}
          multisampling={performanceMode.isLowEnd ? 0 : 2}
        >
          <Bloom
            luminanceThreshold={performanceMode.isLowEnd ? 0.3 : 0}
            luminanceSmoothing={performanceMode.isLowEnd ? 0.4 : 0.2}
            intensity={performanceMode.isLowEnd ? 0.5 : 0.8}
          />
        </EffectComposer>
      )}
    </Canvas>
  );
};

export default OceanDemoCanvas;
