import { useEffect, useState, useRef, useMemo } from 'react';
import { Texture } from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader';
import { TextureOptimizer } from '../utils/textureOptimizer';

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
    const textureOptimizer = new TextureOptimizer();
    
    async function preloadResources() {
      try {
        const gltfLoader = new GLTFLoader();
        const fontLoader = new FontLoader();
        
        // Load font
        if (!cancelled) {
          resourcesRef.current.fonts.gentilis = fontLoader.parse(fontJson);
        }
        
        // Load all resources in parallel with adaptive compression
        const loadPromises = [
          // Optimized water normals - adaptive compression based on device
          textureOptimizer.optimizeTexture(waterNormalsUrl, {
            maxSize: compressionSettings.waterNormalsSize,
            quality: compressionSettings.waterNormalsQuality,
            format: compressionSettings.format
          }).then(texture => {
            if (!cancelled) {
              texture.wrapS = texture.wrapT = 1000; // RepeatWrapping
              resourcesRef.current.textures.waterNormals = texture;
              console.log(`✅ Water normals compressed to ${compressionSettings.waterNormalsSize}px`);
            }
          }),
          
          // Load models
          gltfLoader.loadAsync(sphereUrl).then(gltf => {
            if (!cancelled) {
              optimizeGLTFTextures(gltf);
              resourcesRef.current.models.sphere = gltf;
              console.log('✅ Sphere model loaded and optimized');
            }
          }),
          
          gltfLoader.loadAsync(blockModelUrl).then(gltf => {
            if (!cancelled) {
              optimizeGLTFTextures(gltf);
              resourcesRef.current.models.rubiksCube = gltf;
              console.log('✅ Rubiks cube model loaded and optimized');
            }
          }),
          
          // Background texture - massive compression (7.8MB → ~100-300KB)
          textureOptimizer.optimizeTexture(cloudTextureUrl, {
            maxSize: compressionSettings.backgroundSize,
            quality: compressionSettings.backgroundQuality,
            format: compressionSettings.format,
            flipY: true
          }).then(texture => {
            if (!cancelled) {
              resourcesRef.current.textures.cloudBackground = texture;
              console.log(`✅ Background compressed to ${compressionSettings.backgroundSize}px`);
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
        if ((child as { material?: unknown }).material) {
          const material = (child as unknown as { 
            material: { 
              map?: { 
                generateMipmaps: boolean; 
                minFilter: number; 
                magFilter: number;
                image?: { width?: number; height?: number };
              }; 
              normalMap?: { 
                generateMipmaps: boolean; 
                minFilter: number; 
                magFilter: number;
                image?: { width?: number; height?: number };
              }; 
              roughnessMap?: { 
                generateMipmaps: boolean; 
                minFilter: number; 
                magFilter: number;
                image?: { width?: number; height?: number };
              };
            } 
          }).material;
          
          // Aggressive texture optimization for memory reduction
          const optimizeTexture = (texture: typeof material.map) => {
            if (texture) {
              texture.generateMipmaps = false; // Disable mipmaps to save memory
              texture.minFilter = 1006; // LinearFilter for better performance
              texture.magFilter = 1006; // LinearFilter for magnification
              
              // Log texture size for debugging
              if (texture.image?.width && texture.image?.height) {
                const size = texture.image.width * texture.image.height * 4; // RGBA
                console.log(`Texture size: ${texture.image.width}x${texture.image.height} (${Math.round(size/1024/1024*100)/100}MB)`);
              }
            }
          };
          
          optimizeTexture(material.map);
          optimizeTexture(material.normalMap);
          optimizeTexture(material.roughnessMap);
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