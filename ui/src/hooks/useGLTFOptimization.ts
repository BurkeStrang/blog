import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  FrustumCullingManager, 
  AssetDisposalManager,
  performanceMonitor 
} from '../engine';

interface UseGLTFOptimizationOptions {
  cullingManager?: FrustumCullingManager;
  assetDisposalManager?: AssetDisposalManager;
  enableCulling?: boolean;
  enableAssetDisposal?: boolean;
  priority?: 'low' | 'medium' | 'high';
  logPerformance?: boolean;
}

export function useGLTFOptimization(
  scene: THREE.Group | THREE.Object3D | null,
  options: UseGLTFOptimizationOptions = {}
) {
  const {
    cullingManager,
    assetDisposalManager,
    enableCulling = true,
    enableAssetDisposal = true,
    priority = 'medium',
    logPerformance = false
  } = options;

  const registeredAssetsRef = useRef<Set<string>>(new Set());
  const modelIdRef = useRef<string>(`gltf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!scene) return;

    const modelId = modelIdRef.current;
    const registeredAssets = registeredAssetsRef.current;

    // Register with frustum culling
    if (enableCulling && cullingManager) {
      cullingManager.addObject(scene, modelId);
    }

    // Register assets with disposal manager
    if (enableAssetDisposal && assetDisposalManager) {
      let geometryCount = 0;
      let materialCount = 0;
      let textureCount = 0;

      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Register geometry
          if (child.geometry && !registeredAssets.has(child.geometry.uuid)) {
            const geometryId = `${modelId}-geometry-${child.geometry.uuid}`;
            assetDisposalManager.registerAsset(geometryId, child.geometry, priority);
            registeredAssets.add(child.geometry.uuid);
            geometryCount++;
          }

          // Register materials
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              if (!registeredAssets.has(material.uuid)) {
                const materialId = `${modelId}-material-${material.uuid}`;
                assetDisposalManager.registerAsset(materialId, material, priority);
                registeredAssets.add(material.uuid);
                materialCount++;

                // Register textures from materials
                Object.values(material).forEach((value) => {
                  if (value instanceof THREE.Texture && !registeredAssets.has(value.uuid)) {
                    const textureId = `${modelId}-texture-${value.uuid}`;
                    assetDisposalManager.registerAsset(textureId, value, 'high'); // Textures are high priority
                    registeredAssets.add(value.uuid);
                    textureCount++;
                  }
                });
              }
            });
          }
        }
      });

      if (import.meta.env.DEV) {
        console.log(`💾 Registered ${modelId} assets: ${geometryCount} geometries, ${materialCount} materials, ${textureCount} textures`);
      }
    }

    // Log performance if enabled
    if (logPerformance) {
      performanceMonitor.logStats(`GLTF-${modelId}`);
    }

    // Cleanup function
    return () => {
      if (enableCulling && cullingManager) {
        cullingManager.removeObject(modelId);
      }

      if (enableAssetDisposal && assetDisposalManager) {
        // Unregister all assets
        registeredAssets.forEach((assetUuid) => {
          assetDisposalManager.unregisterAsset(`${modelId}-geometry-${assetUuid}`);
          assetDisposalManager.unregisterAsset(`${modelId}-material-${assetUuid}`);
          assetDisposalManager.unregisterAsset(`${modelId}-texture-${assetUuid}`);
        });
        registeredAssets.clear();
      }
    };
  }, [scene, cullingManager, assetDisposalManager, enableCulling, enableAssetDisposal, priority, logPerformance]);

  // Function to touch assets (mark as recently used)
  const touchAssets = () => {
    if (assetDisposalManager && scene) {
      const modelId = modelIdRef.current;
      const registeredAssets = registeredAssetsRef.current;
      
      registeredAssets.forEach((assetUuid) => {
        assetDisposalManager.touchAsset(`${modelId}-geometry-${assetUuid}`);
        assetDisposalManager.touchAsset(`${modelId}-material-${assetUuid}`);
        assetDisposalManager.touchAsset(`${modelId}-texture-${assetUuid}`);
      });
    }
  };

  return {
    modelId: modelIdRef.current,
    touchAssets,
    registeredAssetsCount: registeredAssetsRef.current.size
  };
}