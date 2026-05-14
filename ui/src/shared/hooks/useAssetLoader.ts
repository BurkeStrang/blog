import { useEffect, useState, useRef, useMemo } from 'react';
import { Texture, Mesh, MeshStandardMaterial, LinearFilter } from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader';
import { TextureCompressor } from '../../engine/rendering';

import waterNormalsUrl from '../../assets/textures/waternormals.avif?url';
import sphereUrl from '../../assets/models/sphere/scene.gltf?url';
import blockModelUrl from '../../assets/models/rubikscube/scene.gltf?url';
import fontJsonUrl from '../../assets/fonts/Noto Sans_Regular.json?url';

type FontData = Parameters<FontLoader['parse']>[0];

interface ResourceCache {
  textures: {
    waterNormals?: Texture;
  };
  models: {
    sphere?: GLTF;
    rubiksCube?: GLTF;
  };
  fonts: {
    inter?: Font;
  };
}

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}


export function useResourcePreloader() {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    error: null
  });
  
  const resourcesRef = useRef<ResourceCache>({
    textures: {},
    models: {},
    fonts: {},
  });
  
  // Detect device capabilities for adaptive compression
  const compressionSettings = useMemo(() => {
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4;
    
    return {
      // More aggressive compression for low-end devices
      waterNormalsSize: isLowEnd ? 128 : 256,
      waterNormalsQuality: isLowEnd ? 0.6 : 0.7,
      backgroundSize: isLowEnd ? 512 : 1024,
      backgroundQuality: isLowEnd ? 0.5 : 0.6,
      format: 'avif' as const // Use AVIF for maximum compression, fallback to WebP
    };
  }, []);
  
  // Track loading phases for better UX

  useEffect(() => {
    let cancelled = false;
    const textureOptimizer = new TextureCompressor();
    
    async function preloadResources() {
      try {
        const gltfLoader = new GLTFLoader();
        const fontLoader = new FontLoader();

        // Load all resources in parallel with adaptive compression
        const loadPromises = [
          // Fetch font JSON as a separate asset so it doesn't bloat the JS bundle.
          fetch(fontJsonUrl)
            .then((r) => r.json() as Promise<FontData>)
            .then((data) => {
              if (!cancelled) {
                resourcesRef.current.fonts.inter = fontLoader.parse(data);
              }
            }),
          // Optimized water normals - adaptive compression based on device
          textureOptimizer.optimizeTexture(waterNormalsUrl, {
            maxSize: compressionSettings.waterNormalsSize,
            quality: compressionSettings.waterNormalsQuality,
            format: compressionSettings.format
          }).then(texture => {
            if (!cancelled) {
              texture.wrapS = texture.wrapT = 1000; // RepeatWrapping
              resourcesRef.current.textures.waterNormals = texture;
              // Water normals compressed
            }
          }),
          
          // Load models
          gltfLoader.loadAsync(sphereUrl).then(gltf => {
            if (!cancelled) {
              optimizeGLTFTextures(gltf);
              resourcesRef.current.models.sphere = gltf;
              // Sphere model loaded and optimized
            }
          }),
          
          gltfLoader.loadAsync(blockModelUrl).then(gltf => {
            if (!cancelled) {
              optimizeGLTFTextures(gltf);
              resourcesRef.current.models.rubiksCube = gltf;
              // Rubiks cube model loaded and optimized
            }
          }),
          
        ];
        
        await Promise.all(loadPromises);
        
        if (!cancelled) {
          setLoadingState({
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        if (!cancelled) {
          setLoadingState({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      } finally {
        // Always dispose the optimizer after operations complete
        textureOptimizer.dispose();
      }
    }
    
    // Optimize GLTF model textures with aggressive compression
    function optimizeGLTFTextures(gltf: GLTF) {
      gltf.scene.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        for (const mat of materials) {
          if (!(mat instanceof MeshStandardMaterial)) continue;
          for (const tex of [mat.map, mat.normalMap, mat.roughnessMap]) {
            if (!tex) continue;
            tex.generateMipmaps = false;
            tex.minFilter = LinearFilter;
            tex.magFilter = LinearFilter;
          }
        }
      });
    }

    preloadResources();

    return () => {
      cancelled = true;
      
      // Dispose all loaded resources
      const resources = resourcesRef.current;
      
      // Dispose textures
      Object.values(resources.textures).forEach(texture => {
        if (texture) texture.dispose();
      });
      
      // Dispose model materials and geometries
      Object.values(resources.models).forEach(gltf => {
        if (gltf) {
          gltf.scene.traverse((child) => {
            const mesh = child as {
              geometry?: { dispose: () => void };
              material?: { dispose: () => void } | { dispose: () => void }[];
            };
            if (mesh.geometry) {
              mesh.geometry.dispose();
            }
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          });
        }
      });
      
      // Clear resource references
      resourcesRef.current = {
        textures: {},
        models: {},
        fonts: {},
      };
      
      // Optimizer disposal is handled in the finally block of preloadResources
    };
  }, []);

  return {
    ...loadingState,
    resources: resourcesRef.current,
  };
}
