/**
 * Optimized Material System
 * Provides material pooling and automatic optimization based on requirements
 */

import * as THREE from 'three';

interface MaterialCache {
  basic: Map<string, THREE.MeshBasicMaterial>;
  lambert: Map<string, THREE.MeshLambertMaterial>;
  phong: Map<string, THREE.MeshPhongMaterial>;
}

export enum MaterialType {
  BASIC = 'basic',
  LAMBERT = 'lambert', 
  PHONG = 'phong'
}

interface MaterialOptions {
  color?: number | string;
  transparent?: boolean;
  opacity?: number;
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  needsLighting?: boolean;
  needsNormalMap?: boolean;
  needsSpecular?: boolean;
}

class OptimizedMaterialManager {
  private cache: MaterialCache = {
    basic: new Map(),
    lambert: new Map(),
    phong: new Map()
  };

  private maxCacheSize = 50; // Limit cache size to prevent memory bloat

  // Get optimized material based on requirements
  getMaterial(options: MaterialOptions): THREE.Material {
    const materialType = this.determineBestMaterialType(options);
    const cacheKey = this.generateCacheKey(options);
    
    // Check cache first
    const cached = this.cache[materialType].get(cacheKey);
    if (cached) {
      return cached;
    }

    // Create new material
    const material = this.createMaterial(materialType, options);
    
    // Add to cache if not full
    if (this.cache[materialType].size < this.maxCacheSize) {
      switch (materialType) {
        case MaterialType.BASIC:
          this.cache.basic.set(cacheKey, material as THREE.MeshBasicMaterial);
          break;
        case MaterialType.LAMBERT:
          this.cache.lambert.set(cacheKey, material as THREE.MeshLambertMaterial);
          break;
        case MaterialType.PHONG:
          this.cache.phong.set(cacheKey, material as THREE.MeshPhongMaterial);
          break;
      }
    }

    return material;
  }

  // Automatically determine the cheapest material that meets requirements
  private determineBestMaterialType(options: MaterialOptions): MaterialType {
    // MeshBasicMaterial: No lighting calculations (cheapest)
    if (!options.needsLighting && !options.needsNormalMap && !options.needsSpecular) {
      return MaterialType.BASIC;
    }

    // MeshLambertMaterial: Basic lighting (medium cost)
    if (options.needsLighting && !options.needsSpecular && !options.needsNormalMap) {
      return MaterialType.LAMBERT;
    }

    // MeshPhongMaterial: Specular + normal maps (expensive)
    return MaterialType.PHONG;
  }

  private createMaterial(type: MaterialType, options: MaterialOptions): THREE.Material {
    const baseParams: Partial<THREE.MeshBasicMaterialParameters> = {
      color: options.color ?? 0xffffff,
      transparent: options.transparent ?? false,
      opacity: options.opacity ?? 1
    };

    // Only add map if it's defined (not undefined)
    if (options.map !== undefined) {
      baseParams.map = options.map;
    }

    switch (type) {
      case MaterialType.BASIC:
        return new THREE.MeshBasicMaterial(baseParams);

      case MaterialType.LAMBERT:
        return new THREE.MeshLambertMaterial(baseParams);

      case MaterialType.PHONG:
        const phongParams: Partial<THREE.MeshPhongMaterialParameters> = { 
          ...baseParams, 
          shininess: 30 
        };
        // Only add normalMap if it's defined
        if (options.normalMap !== undefined) {
          phongParams.normalMap = options.normalMap;
        }
        return new THREE.MeshPhongMaterial(phongParams);

      default:
        return new THREE.MeshBasicMaterial(baseParams);
    }
  }

  private generateCacheKey(options: MaterialOptions): string {
    return JSON.stringify({
      color: options.color,
      transparent: options.transparent,
      opacity: options.opacity,
      hasMap: !!options.map,
      hasNormalMap: !!options.normalMap,
      needsLighting: options.needsLighting,
      needsSpecular: options.needsSpecular
    });
  }

  // Pre-create common materials
  preloadCommonMaterials() {
    const commonColors = [0xffffff, 0x000000, 0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    
    commonColors.forEach(color => {
      // Basic materials
      this.getMaterial({ color, needsLighting: false });
      
      // Lambert materials  
      this.getMaterial({ color, needsLighting: true });
      
      // Transparent versions
      this.getMaterial({ color, transparent: true, opacity: 0.8 });
    });
  }

  // Get material specifically for post cubes (optimized for your use case)
  getPostCubeMaterial(color: number, isHovered = false): THREE.Material {
    return this.getMaterial({
      color,
      transparent: isHovered,
      opacity: isHovered ? 0.8 : 1.0,
      needsLighting: true, // Lambert lighting for depth
      needsSpecular: true, // No expensive specular
      needsNormalMap: true // No normal maps for simple cubes
    });
  }

  // Get material for ocean/water (basic for performance)
  getOceanMaterial(options: { map?: THREE.Texture; normalMap?: THREE.Texture }): THREE.Material {
    return this.getMaterial({
      color: 0x006994,
      transparent: true,
      opacity: 0.8,
      map: options.map,
      needsLighting: true, // Basic material for water for better performance
      needsNormalMap: true // Skip normal maps for now
    });
  }

  // Dispose all cached materials
  dispose() {
    Object.values(this.cache).forEach((cache: Map<string, THREE.Material>) => {
      cache.forEach((material: THREE.Material) => material.dispose());
      cache.clear();
    });
  }

  // Get cache statistics
  getStats() {
    return {
      basicMaterials: this.cache.basic.size,
      lambertMaterials: this.cache.lambert.size,
      phongMaterials: this.cache.phong.size,
      totalCached: this.cache.basic.size + this.cache.lambert.size + this.cache.phong.size
    };
  }
}

// Singleton instance
export const materialManager = new OptimizedMaterialManager();
