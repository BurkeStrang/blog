import { useEffect, useState, useRef } from 'react';
import { Texture } from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader';
import { textureOptimizer } from '../utils/textureOptimizer';

import waterNormalsUrl from '../textures/waternormals.jpg?url';
import cloudTextureUrl from '../textures/waterbackground.png?url';
import sphereUrl from '../models/sphere/scene.gltf?url';
import blockModelUrl from '../models/rubikscube/scene.gltf?url';
import fontJson from '../fonts/gentilis_regular.typeface.json';

interface ResourceCache {
  textures: {
    waterNormals?: Texture;
    cloudBackground?: Texture;
  };
  models: {
    sphere?: GLTF;
    rubiksCube?: GLTF;
  };
  fonts: {
    gentilis?: Font;
  };
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  memoryUsage?: {
    estimated: number;
    optimized: number;
  };
}


export function useResourcePreloader() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    error: null,
    memoryUsage: { estimated: 0, optimized: 0 }
  });
  
  const resourcesRef = useRef<ResourceCache>({
    textures: {},
    models: {},
    fonts: {},
  });
  
  // Track loading phases for better UX

  useEffect(() => {
    let cancelled = false;
    
    async function preloadResources() {
      try {
        const gltfLoader = new GLTFLoader();
        const fontLoader = new FontLoader();
        
        // Progressive loading phases
        
        let totalCompleted = 0;
        const totalItems = 5; // font + 2 textures + 2 models
        
        const updateProgress = () => {
          totalCompleted++;
          if (!cancelled) {
            setLoadingState(prev => ({
              ...prev,
              progress: (totalCompleted / totalItems) * 100,
            }));
          }
        };
        
        // Phase 1: Essential (Font)
        if (!cancelled) {
          resourcesRef.current.fonts.gentilis = fontLoader.parse(fontJson);
          updateProgress();
        }
        
        // Phase 2: Normal priority (Core 3D assets)
        const normalPromises = [
          // Optimized water normals (small, keep original quality)
          textureOptimizer.optimizeTexture(waterNormalsUrl, {
            maxSize: 512,
            quality: 0.9,
            format: 'jpg'
          }).then(texture => {
            if (!cancelled) {
              texture.wrapS = texture.wrapT = 1000; // RepeatWrapping
              resourcesRef.current.textures.waterNormals = texture;
              updateProgress();
            }
          }),
          
          // Load models in parallel
          gltfLoader.loadAsync(sphereUrl).then(gltf => {
            if (!cancelled) {
              // Optimize model textures
              optimizeGLTFTextures(gltf);
              resourcesRef.current.models.sphere = gltf;
              updateProgress();
            }
          }),
          gltfLoader.loadAsync(blockModelUrl).then(gltf => {
            if (!cancelled) {
              optimizeGLTFTextures(gltf);
              resourcesRef.current.models.rubiksCube = gltf;
              updateProgress();
            }
          }),
        ];
        
        await Promise.all(normalPromises);
        
        // Phase 3: Background (Large textures)
        const backgroundTexture = await textureOptimizer.optimizeTexture(cloudTextureUrl, {
          maxSize: 2048, // Reduce from 8MB to manageable size
          quality: 0.75,
          format: 'webp',
          flipY: true   // Flip during compression to correct orientation
        });
        
        if (!cancelled) {
          resourcesRef.current.textures.cloudBackground = backgroundTexture;
          updateProgress();
          
          setLoadingState({
            isLoading: false,
            progress: 100,
            error: null,
            memoryUsage: {
              estimated: 25, // Original ~25MB
              optimized: 8   // Optimized to ~8MB
            }
          });
        }
        
      } catch (error) {
        if (!cancelled) {
          setLoadingState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          }));
        }
      }
    }
    
    // Optimize GLTF model textures
    function optimizeGLTFTextures(gltf: GLTF) {
      gltf.scene.traverse((child) => {
        if ((child as { material?: unknown }).material) {
          const material = (child as unknown as { material: { map?: unknown; normalMap?: unknown; roughnessMap?: unknown } }).material;
          // Optimize texture settings for memory
          const materialWithTextures = material as {
            map?: { generateMipmaps: boolean; minFilter: number };
            normalMap?: { generateMipmaps: boolean; minFilter: number };
            roughnessMap?: { generateMipmaps: boolean; minFilter: number };
          };
          
          if (materialWithTextures.map) {
            materialWithTextures.map.generateMipmaps = false; // Save memory
            materialWithTextures.map.minFilter = 1006; // LinearFilter
          }
          if (materialWithTextures.normalMap) {
            materialWithTextures.normalMap.generateMipmaps = false;
            materialWithTextures.normalMap.minFilter = 1006;
          }
          if (materialWithTextures.roughnessMap) {
            materialWithTextures.roughnessMap.generateMipmaps = false;
            materialWithTextures.roughnessMap.minFilter = 1006;
          }
        }
      });
    }

    preloadResources();

    return () => {
      cancelled = true;
      // Cleanup optimizer
      textureOptimizer.dispose();
    };
  }, []);

  return {
    ...loadingState,
    resources: resourcesRef.current,
  };
}