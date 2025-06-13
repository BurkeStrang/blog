import { Object3D, Material, Texture, BufferGeometry } from 'three';

export class MemoryManager {
  private disposables: Set<{ dispose: () => void }> = new Set();
  private intervalId?: NodeJS.Timeout;
  private cleanupThreshold = 1000 * 60 * 2; // 2 minutes
  
  constructor() {
    this.startCleanupInterval();
  }

  // Register objects for automatic cleanup
  register<T extends { dispose: () => void }>(object: T): T {
    this.disposables.add(object);
    return object;
  }

  // Unregister without disposing
  unregister(object: { dispose: () => void }) {
    this.disposables.delete(object);
  }

  // Deep dispose of Three.js objects
  disposeObject3D(object: Object3D) {
    object.traverse((child) => {
      // Dispose geometries
      if (child instanceof Object3D && (child as { geometry?: BufferGeometry }).geometry) {
        const geometry = (child as unknown as { geometry: BufferGeometry }).geometry;
        this.disposeGeometry(geometry);
      }

      // Dispose materials
      if (child instanceof Object3D && (child as { material?: unknown }).material) {
        const material = (child as unknown as { material: Material | Material[] }).material;
        if (Array.isArray(material)) {
          material.forEach(mat => this.disposeMaterial(mat));
        } else {
          this.disposeMaterial(material);
        }
      }
    });

    // Remove from parent
    if (object.parent) {
      object.parent.remove(object);
    }
  }

  // Dispose geometry and free GPU memory
  disposeGeometry(geometry: BufferGeometry) {
    if (geometry && typeof geometry.dispose === 'function') {
      geometry.dispose();
    }
  }

  // Dispose material and its textures
  disposeMaterial(material: Material) {
    if (!material || typeof material.dispose !== 'function') return;

    // Dispose all textures in material
    Object.values(material).forEach(value => {
      if (value && typeof value === 'object' && 'dispose' in value) {
        if (value.constructor.name.includes('Texture')) {
          this.disposeTexture(value as Texture);
        }
      }
    });

    material.dispose();
  }

  // Dispose texture and free GPU memory
  disposeTexture(texture: Texture) {
    if (texture && typeof texture.dispose === 'function') {
      texture.dispose();
    }
  }

  // Force cleanup of all registered disposables
  cleanup() {
    console.log(`Disposing ${this.disposables.size} objects`);
    this.disposables.forEach(obj => {
      try {
        obj.dispose();
      } catch (error) {
        console.warn('Error disposing object:', error);
      }
    });
    this.disposables.clear();
  }

  // Periodic cleanup of unused objects
  private startCleanupInterval() {
    this.intervalId = setInterval(() => {
      this.performanceCleaup();
    }, this.cleanupThreshold);
  }

  private performanceCleaup() {
    // Force garbage collection if available (Chrome dev tools)
    if (typeof (window as { gc?: () => void }).gc === 'function') {
      (window as { gc: () => void }).gc();
    }
    
    // Log memory usage
    if ((performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      console.log('Memory usage:', {
        used: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
        total: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
        limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
      });
    }
  }

  // Get memory info if available
  getMemoryInfo() {
    if ((performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        usedMB: Math.round(memory.usedJSHeapSize / 1048576),
        totalMB: Math.round(memory.totalJSHeapSize / 1048576),
        limitMB: Math.round(memory.jsHeapSizeLimit / 1048576)
      };
    }
    return null;
  }

  // Check if memory usage is getting high
  isMemoryHigh(): boolean {
    const info = this.getMemoryInfo();
    if (!info) return false;
    
    return info.used / info.limit > 0.8; // 80% threshold
  }

  dispose() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.cleanup();
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// Helper function to check memory and cleanup if needed
export function cleanupIfMemoryHigh() {
  if (memoryManager.isMemoryHigh()) {
    console.log('High memory usage detected, forcing cleanup');
    memoryManager.cleanup();
  }
}