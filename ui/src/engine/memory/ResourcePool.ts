/**
 * Enhanced Object Pooling System for Memory Efficiency
 * Reduces GC pressure by reusing Three.js objects, materials, and geometries
 */

import * as THREE from 'three';

// Generic object pool
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(factory: () => T, resetFn?: (obj: T) => void, maxSize: number = 50) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  get(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(obj);
      }
      this.pool.push(obj);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  size(): number {
    return this.pool.length;
  }
}

// Material Pool for common materials
export class MaterialPool {
  private static pools: Map<string, ObjectPool<THREE.Material>> = new Map();

  static getMaterial<T extends THREE.Material>(
    key: string,
    factory: () => T,
    resetFn?: (material: T) => void
  ): T {
    if (!this.pools.has(key)) {
      this.pools.set(key, new ObjectPool<THREE.Material>(factory as () => THREE.Material, resetFn as (obj: THREE.Material) => void));
    }
    return this.pools.get(key)!.get() as T;
  }

  static releaseMaterial(key: string, material: THREE.Material): void {
    const pool = this.pools.get(key);
    if (pool) {
      pool.release(material);
    }
  }

  static clearAll(): void {
    this.pools.forEach(pool => {
      // Dispose all pooled materials
      while (pool.size() > 0) {
        const material = pool.get();
        if (material && typeof material.dispose === 'function') {
          material.dispose();
        }
      }
      pool.clear();
    });
    this.pools.clear();
  }

  static getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.pools.forEach((pool, key) => {
      stats[key] = pool.size();
    });
    return stats;
  }
}

// Vector3 Pool for reducing allocations
export class Vector3Pool {
  private static pool = new ObjectPool(
    () => new THREE.Vector3(),
    (v) => v.set(0, 0, 0),
    100
  );

  static get(): THREE.Vector3 {
    return this.pool.get();
  }

  static release(vector: THREE.Vector3): void {
    this.pool.release(vector);
  }

  static clear(): void {
    this.pool.clear();
  }
}

// Quaternion Pool
export class QuaternionPool {
  private static pool = new ObjectPool(
    () => new THREE.Quaternion(),
    (q) => q.set(0, 0, 0, 1),
    50
  );

  static get(): THREE.Quaternion {
    return this.pool.get();
  }

  static release(quaternion: THREE.Quaternion): void {
    this.pool.release(quaternion);
  }

  static clear(): void {
    this.pool.clear();
  }
}

// Matrix4 Pool
export class Matrix4Pool {
  private static pool = new ObjectPool(
    () => new THREE.Matrix4(),
    (m) => m.identity(),
    30
  );

  static get(): THREE.Matrix4 {
    return this.pool.get();
  }

  static release(matrix: THREE.Matrix4): void {
    this.pool.release(matrix);
  }

  static clear(): void {
    this.pool.clear();
  }
}

// Color Pool
export class ColorPool {
  private static pool = new ObjectPool(
    () => new THREE.Color(),
    (c) => c.set(0xffffff),
    50
  );

  static get(): THREE.Color {
    return this.pool.get();
  }

  static release(color: THREE.Color): void {
    this.pool.release(color);
  }

  static clear(): void {
    this.pool.clear();
  }
}

// Mesh Pool for frequently created/destroyed meshes
export class MeshPool {
  private static pools: Map<string, ObjectPool<THREE.Mesh>> = new Map();

  static getMesh(
    key: string,
    geometryFactory: () => THREE.BufferGeometry,
    materialFactory: () => THREE.Material
  ): THREE.Mesh {
    if (!this.pools.has(key)) {
      const factory = () => {
        const geometry = geometryFactory();
        const material = materialFactory();
        return new THREE.Mesh(geometry, material);
      };
      
      const resetFn = (mesh: THREE.Mesh) => {
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        mesh.visible = true;
      };
      
      this.pools.set(key, new ObjectPool<THREE.Mesh>(factory as () => THREE.Mesh, resetFn as (obj: THREE.Mesh) => void, 20));
    }
    
    return this.pools.get(key)!.get();
  }

  static releaseMesh(key: string, mesh: THREE.Mesh): void {
    const pool = this.pools.get(key);
    if (pool) {
      pool.release(mesh);
    }
  }

  static clearAll(): void {
    this.pools.forEach(pool => {
      while (pool.size() > 0) {
        const mesh = pool.get();
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => mat.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
      pool.clear();
    });
    this.pools.clear();
  }

  static getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.pools.forEach((pool, key) => {
      stats[key] = pool.size();
    });
    return stats;
  }
}

// Cleanup function for all pools
export const clearAllPools = (): void => {
  Vector3Pool.clear();
  QuaternionPool.clear();
  Matrix4Pool.clear();
  ColorPool.clear();
  MaterialPool.clearAll();
  MeshPool.clearAll();
  console.log('🧹 All object pools cleared');
};

// Statistics for debugging
export const getPoolStats = (): Record<string, unknown> => {
  return {
    Vector3: Vector3Pool['pool'].size(),
    Quaternion: QuaternionPool['pool'].size(),
    Matrix4: Matrix4Pool['pool'].size(),
    Color: ColorPool['pool'].size(),
    Materials: MaterialPool.getStats(),
    Meshes: MeshPool.getStats(),
  };
};

// Store interval reference for cleanup
let poolStatsInterval: ReturnType<typeof setInterval> | undefined;

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearAllPools();
    if (poolStatsInterval) {
      clearInterval(poolStatsInterval);
      poolStatsInterval = undefined;
    }
  });
  
  // Development helper - log pool stats every 2 minutes
  if (process.env.NODE_ENV === 'development') {
    poolStatsInterval = setInterval(() => {
      const stats = getPoolStats();
      const hasContent = Object.values(stats).some(value => {
        if (typeof value === 'number') return value > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return false;
      });
      
      if (hasContent) {
        console.log('🎱 Object Pool Stats:', stats);
      }
    }, 120000);
  }
}