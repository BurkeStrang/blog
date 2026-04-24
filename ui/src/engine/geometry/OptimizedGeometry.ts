/**
 * Optimized Geometry System
 * Implements BufferGeometry pooling and instancing for better performance
 */

import * as THREE from 'three';

interface GeometryPool {
  box: THREE.BoxGeometry[];
  sphere: THREE.SphereGeometry[];
  plane: THREE.PlaneGeometry[];
}

class OptimizedGeometryManager {
  private pools: GeometryPool = {
    box: [],
    sphere: [],
    plane: []
  };

  private readonly poolSizes = {
    box: 10,      // Pool 10 box geometries
    sphere: 5,    // Pool 5 sphere geometries  
    plane: 5      // Pool 5 plane geometries
  };

  private instancedGeometries = new Map<string, THREE.InstancedBufferGeometry>();

  constructor() {
    this.initializePools();
  }

  private initializePools() {
    // Pre-create geometries for pooling
    for (let i = 0; i < this.poolSizes.box; i++) {
      this.pools.box.push(new THREE.BoxGeometry(1, 1, 1));
    }

    for (let i = 0; i < this.poolSizes.sphere; i++) {
      this.pools.sphere.push(new THREE.SphereGeometry(1, 16, 12)); // Reduced segments
    }

    for (let i = 0; i < this.poolSizes.plane; i++) {
      this.pools.plane.push(new THREE.PlaneGeometry(1, 1));
    }
  }

  // Get optimized box geometry (shared or pooled)
  getBoxGeometry(width = 1, height = 1, depth = 1): THREE.BoxGeometry {
    // For standard 1x1x1 cubes, use pooled geometry
    if (width === 1 && height === 1 && depth === 1) {
      return this.pools.box[0]; // Reuse same geometry for all 1x1x1 cubes
    }

    // For custom sizes, create new geometry
    return new THREE.BoxGeometry(width, height, depth);
  }

  // Get optimized sphere geometry
  getSphereGeometry(radius = 1, segments = 16): THREE.SphereGeometry {
    // Use pooled geometry for standard spheres
    if (radius === 1 && segments === 16) {
      return this.pools.sphere[0];
    }

    return new THREE.SphereGeometry(radius, segments, Math.max(8, segments / 2));
  }

  // Get optimized plane geometry
  getPlaneGeometry(width = 1, height = 1, segments = 1): THREE.PlaneGeometry {
    // Use pooled geometry for standard planes
    if (width === 1 && height === 1 && segments === 1) {
      return this.pools.plane[0];
    }

    return new THREE.PlaneGeometry(width, height, segments, segments);
  }

  // Create instanced geometry for repeated objects
  createInstancedGeometry(
    baseGeometry: THREE.BufferGeometry,
    instanceCount: number,
    key: string
  ): THREE.InstancedBufferGeometry {
    if (this.instancedGeometries.has(key)) {
      return this.instancedGeometries.get(key)!;
    }

    const instancedGeometry = new THREE.InstancedBufferGeometry();
    instancedGeometry.copy(baseGeometry as THREE.InstancedBufferGeometry);
    instancedGeometry.instanceCount = instanceCount;

    // Add instance attributes for transformations
    const instanceMatrix = new Float32Array(instanceCount * 16);
    const instanceColor = new Float32Array(instanceCount * 3);

    instancedGeometry.setAttribute(
      'instanceMatrix',
      new THREE.InstancedBufferAttribute(instanceMatrix, 16)
    );
    instancedGeometry.setAttribute(
      'instanceColor',
      new THREE.InstancedBufferAttribute(instanceColor, 3)
    );

    this.instancedGeometries.set(key, instancedGeometry);
    return instancedGeometry;
  }

  // Dispose all cached geometries
  dispose() {
    Object.values(this.pools).forEach((pool: THREE.BufferGeometry[]) => {
      pool.forEach((geometry: THREE.BufferGeometry) => geometry.dispose());
    });

    this.instancedGeometries.forEach(geometry => geometry.dispose());
    this.instancedGeometries.clear();
    
    // Force garbage collection if available (development/debug mode)
    if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
      (window as unknown as { gc: () => void }).gc();
    }
  }

  // Get statistics
  getStats() {
    return {
      pooledGeometries: Object.values(this.pools).flat().length,
      instancedGeometries: this.instancedGeometries.size,
      totalGeometries: Object.values(this.pools).flat().length + this.instancedGeometries.size
    };
  }
}

// Singleton instance
export const geometryManager = new OptimizedGeometryManager();

// Make geometry manager globally accessible for cleanup
if (typeof window !== 'undefined') {
  (window as Window & { geometryManager?: OptimizedGeometryManager }).geometryManager = geometryManager;
}

// Utility function to merge geometries (for reducing draw calls)
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) {
    throw new Error('No geometries provided for merging');
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  // Simple merge implementation (Three.js BufferGeometryUtils is external)
  // For now, just return the first geometry as a fallback
  console.warn('Geometry merging not implemented - using first geometry');
  return geometries[0];
}

// Create optimized material based on requirements
export function createOptimizedMaterial(options: {
  color?: string | number;
  needsLighting?: boolean;
  transparent?: boolean;
  opacity?: number;
  map?: THREE.Texture;
}): THREE.Material {
  const { color = 0xffffff, needsLighting = false, transparent = false, opacity = 1, map } = options;

  // Choose the most basic material that meets requirements
  if (!needsLighting) {
    return new THREE.MeshBasicMaterial({
      color,
      transparent,
      opacity,
      map
    });
  } else {
    // Use Lambert for basic lighting (cheaper than Phong/Standard)
    return new THREE.MeshLambertMaterial({
      color,
      transparent,
      opacity,
      map
    });
  }
}