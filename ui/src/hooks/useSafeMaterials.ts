import { useMemo } from 'react';
import { Material, Texture, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial } from 'three';

/**
 * Custom hook to create safe materials that handle undefined textures
 * This prevents Three.js warnings about undefined texture maps
 */
export function useSafeMaterials<T extends Record<string, Material>>(materials: T): T {
  return useMemo(() => {
    const safeMaterials = {} as T;
    
    Object.entries(materials).forEach(([key, material]) => {
      // Clone the material to avoid modifying the original
      const safeMaterial = material.clone() as Material;
      
      // Check and clean common texture properties
      const textureProperties = [
        'map',
        'normalMap', 
        'roughnessMap',
        'metalnessMap',
        'aoMap',
        'specularMap',
        'emissiveMap',
        'bumpMap',
        'displacementMap',
        'alphaMap'
      ];
      
      textureProperties.forEach(prop => {
        if (prop in safeMaterial) {
          const materialWithTextures = safeMaterial as Material & Record<string, Texture | null | undefined>;
          const texture = materialWithTextures[prop];
          if (texture === undefined) {
            materialWithTextures[prop] = null;
          }
        }
      });
      
      // Force material update
      safeMaterial.needsUpdate = true;
      
      safeMaterials[key as keyof T] = safeMaterial as T[keyof T];
    });
    
    return safeMaterials;
  }, [materials]);
}

/**
 * Create a fallback material for when textures fail to load
 */
export function createFallbackMaterial(options: {
  color?: number;
  type?: 'basic' | 'lambert' | 'standard';
} = {}): Material {
  const { color = 0x808080, type = 'standard' } = options;
  
  switch (type) {
    case 'basic':
      return new MeshBasicMaterial({ color });
    case 'lambert':
      return new MeshLambertMaterial({ color });
    case 'standard':
    default:
      return new MeshStandardMaterial({ 
        color,
        roughness: 0.7,
        metalness: 0.1
      });
  }
}