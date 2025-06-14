import { Texture, BufferGeometry, Material, Object3D, Mesh, MeshStandardMaterial } from 'three';
import { memoryMonitor } from './MemoryProfiler';

interface DisposableResource {
  resource: Texture | BufferGeometry | Material;
  type: 'texture' | 'geometry' | 'material';
  created: number;
  lastUsed: number;
  references: number;
  size: number;
}

/**
 * Automatic resource disposal system to prevent memory leaks
 */
export class AutoDisposer {
  private resources = new Map<string, DisposableResource>();
  private disposalQueue = new Set<string>();
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private maxUnusedTime = 60000; // 1 minute
  private maxMemoryUsage = 500 * 1024 * 1024; // 500MB
  private isEnabled = true;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Track a resource for automatic disposal
   */
  track(resource: Texture | BufferGeometry | Material, type: DisposableResource['type']) {
    const id = this.getResourceId(resource);
    const size = this.estimateSize(resource, type);
    
    this.resources.set(id, {
      resource,
      type,
      created: Date.now(),
      lastUsed: Date.now(),
      references: 1,
      size
    });

    // Take memory snapshot when tracking new resources
    memoryMonitor.takeSnapshot('AutoDisposer', `track-${type}`);
  }

  /**
   * Mark a resource as used (updates lastUsed timestamp)
   */
  use(resource: Texture | BufferGeometry | Material) {
    const id = this.getResourceId(resource);
    const tracked = this.resources.get(id);
    if (tracked) {
      tracked.lastUsed = Date.now();
    }
  }

  /**
   * Add a reference to a resource
   */
  addReference(resource: Texture | BufferGeometry | Material) {
    const id = this.getResourceId(resource);
    const tracked = this.resources.get(id);
    if (tracked) {
      tracked.references++;
    }
  }

  /**
   * Remove a reference from a resource
   */
  removeReference(resource: Texture | BufferGeometry | Material) {
    const id = this.getResourceId(resource);
    const tracked = this.resources.get(id);
    if (tracked) {
      tracked.references = Math.max(0, tracked.references - 1);
      if (tracked.references === 0) {
        this.scheduleDisposal(id);
      }
    }
  }

  /**
   * Manually dispose a resource immediately
   */
  dispose(resource: Texture | BufferGeometry | Material) {
    const id = this.getResourceId(resource);
    this.disposeResource(id);
  }

  /**
   * Dispose all resources in a Three.js object
   */
  disposeObject(object: Object3D) {
    object.traverse((child) => {
      if (child instanceof Mesh) {
        if (child.geometry) {
          this.dispose(child.geometry);
        }
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            this.dispose(material);
            // Dispose material textures
            this.disposeMaterialTextures(material);
          });
        }
      }
    });
  }

  private disposeMaterialTextures(material: Material) {
    if (material instanceof MeshStandardMaterial) {
      const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'] as const;
      textureProps.forEach(prop => {
        const texture = material[prop];
        if (texture instanceof Texture) {
          this.dispose(texture);
        }
      });
    }
  }

  private scheduleDisposal(resourceId: string) {
    this.disposalQueue.add(resourceId);
  }

  private startCleanupTimer() {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupUnusedResources();
    }, 30000); // Clean up every 30 seconds
  }

  private cleanupUnusedResources() {
    if (!this.isEnabled) return;

    const now = Date.now();
    const toDispose: string[] = [];

    // Check for unused resources
    this.resources.forEach((tracked, id) => {
      const unused = now - tracked.lastUsed > this.maxUnusedTime;
      const noReferences = tracked.references === 0;
      
      if (unused || noReferences || this.disposalQueue.has(id)) {
        toDispose.push(id);
      }
    });

    // Check memory pressure
    if (this.shouldForceCleanup()) {
      const sortedByAge = Array.from(this.resources.entries())
        .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)
        .slice(0, Math.floor(this.resources.size * 0.3)); // Dispose oldest 30%
      
      sortedByAge.forEach(([id]) => {
        if (!toDispose.includes(id)) {
          toDispose.push(id);
        }
      });
    }

    // Dispose resources
    let disposedCount = 0;
    let disposedSize = 0;
    
    toDispose.forEach(id => {
      const resource = this.resources.get(id);
      if (resource) {
        disposedSize += resource.size;
        disposedCount++;
      }
      this.disposeResource(id);
    });

    if (disposedCount > 0) {
      console.log(`🗑️ Auto-disposed ${disposedCount} resources (${Math.round(disposedSize / 1024 / 1024)}MB)`);
      memoryMonitor.takeSnapshot('AutoDisposer', 'cleanup');
    }
  }

  private shouldForceCleanup(): boolean {
    if (!('memory' in performance)) return false;
    
    const memory = (performance as unknown as {
      memory: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
      };
    }).memory;
    return memory.usedJSHeapSize > this.maxMemoryUsage;
  }

  private disposeResource(resourceId: string) {
    const tracked = this.resources.get(resourceId);
    if (!tracked) return;

    try {
      // Call Three.js dispose method
      if ('dispose' in tracked.resource && typeof tracked.resource.dispose === 'function') {
        tracked.resource.dispose();
      }
    } catch (error) {
      console.warn(`Failed to dispose ${tracked.type}:`, error);
    }

    this.resources.delete(resourceId);
    this.disposalQueue.delete(resourceId);
  }

  private getResourceId(resource: Texture | BufferGeometry | Material): string {
    return resource.uuid || `${resource.constructor.name}_${Date.now()}_${Math.random()}`;
  }

  private estimateSize(resource: Texture | BufferGeometry | Material, type: DisposableResource['type']): number {
    switch (type) {
      case 'texture':
        if ('image' in resource && resource.image) {
          const { width = 1024, height = 1024 } = resource.image;
          return width * height * 4; // RGBA bytes
        }
        return 1024 * 1024 * 4; // Default 1MB
      case 'geometry':
        if ('attributes' in resource && resource.attributes) {
          let size = 0;
          Object.values(resource.attributes).forEach((attr) => {
            if (attr && 'array' in attr && attr.array) {
              size += attr.array.byteLength || 0;
            }
          });
          return size;
        }
        return 1024; // Default 1KB
      case 'material':
        return 1024; // Materials are usually small
      default:
        return 0;
    }
  }

  /**
   * Get statistics about tracked resources
   */
  getStats() {
    const stats = {
      totalResources: this.resources.size,
      totalSize: 0,
      byType: { texture: 0, geometry: 0, material: 0 },
      queuedForDisposal: this.disposalQueue.size,
      oldestResource: Infinity,
      newestResource: 0
    };

    const now = Date.now();
    this.resources.forEach(resource => {
      stats.totalSize += resource.size;
      stats.byType[resource.type]++;
      
      const age = now - resource.created;
      if (age < stats.oldestResource) stats.oldestResource = age;
      if (age > stats.newestResource) stats.newestResource = age;
    });

    return stats;
  }

  /**
   * Enable or disable automatic disposal
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled && !this.cleanupInterval) {
      this.startCleanupTimer();
    }
  }

  /**
   * Force immediate cleanup of all unused resources
   */
  forceCleanup() {
    this.cleanupUnusedResources();
  }

  /**
   * Dispose the auto-disposer itself
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    // Dispose all tracked resources
    this.resources.forEach((_, id) => {
      this.disposeResource(id);
    });
    
    this.resources.clear();
    this.disposalQueue.clear();
  }
}

export const autoDisposer = new AutoDisposer();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    autoDisposer.destroy();
  });
}