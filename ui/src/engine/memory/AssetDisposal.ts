import { Object3D, BufferGeometry, Material, Texture, Mesh, Group } from 'three';

export interface DisposableAsset {
  id: string;
  type: 'geometry' | 'material' | 'texture' | 'mesh' | 'group';
  asset: Object3D | BufferGeometry | Material | Texture;
  memorySize: number;
  lastUsed: number;
  usageCount: number;
  priority: 'low' | 'medium' | 'high';
  canDispose: boolean;
}

export interface AssetDisposalOptions {
  maxMemoryMB: number;
  maxUnusedTime: number; // Time in ms before asset is considered for disposal
  checkInterval: number; // How often to check for disposal in ms
  enableAutoDisposal: boolean;
  preserveActiveAssets: boolean;
}

export class AssetDisposalManager {
  private assets: Map<string, DisposableAsset> = new Map();
  private options: AssetDisposalOptions;
  private totalMemoryUsed: number = 0;
  private intervalId: number | null = null;
  private stats = {
    totalAssets: 0,
    totalMemoryMB: 0,
    disposedAssets: 0,
    memoryFreedMB: 0,
    lastCleanup: Date.now()
  };

  constructor(options: Partial<AssetDisposalOptions> = {}) {
    this.options = {
      maxMemoryMB: 50, // More aggressive 50MB limit
      maxUnusedTime: 30000, // 30 seconds instead of 1 minute
      checkInterval: 5000, // 5 seconds instead of 10 seconds
      enableAutoDisposal: true,
      preserveActiveAssets: true,
      ...options
    };

    if (this.options.enableAutoDisposal) {
      this.startAutoDisposal();
    }
  }

  // Register asset for disposal management
  registerAsset(
    id: string,
    asset: Object3D | BufferGeometry | Material | Texture,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): void {
    if (this.assets.has(id)) {
      // Update existing asset
      this.touchAsset(id);
      return;
    }

    const type = this.getAssetType(asset);
    const memorySize = this.calculateMemorySize(asset, type);

    const disposableAsset: DisposableAsset = {
      id,
      type,
      asset,
      memorySize,
      lastUsed: Date.now(),
      usageCount: 1,
      priority,
      canDispose: true
    };

    this.assets.set(id, disposableAsset);
    this.totalMemoryUsed += memorySize;
    this.updateStats();
  }

  // Mark asset as used (prevents disposal)
  touchAsset(id: string): void {
    const asset = this.assets.get(id);
    if (asset) {
      asset.lastUsed = Date.now();
      asset.usageCount++;
    }
  }

  // Unregister asset from disposal management
  unregisterAsset(id: string): void {
    const asset = this.assets.get(id);
    if (asset) {
      this.totalMemoryUsed -= asset.memorySize;
      this.assets.delete(id);
      this.updateStats();
    }
  }

  // Manually dispose specific asset
  disposeAsset(id: string): boolean {
    const asset = this.assets.get(id);
    if (!asset || !asset.canDispose) {
      return false;
    }

    const disposed = this.performDisposal(asset);
    if (disposed) {
      this.totalMemoryUsed -= asset.memorySize;
      this.assets.delete(id);
      this.stats.disposedAssets++;
      this.stats.memoryFreedMB += asset.memorySize / (1024 * 1024);
      this.updateStats();
    }

    return disposed;
  }

  // Force disposal of all assets
  disposeAll(): void {
    const assetsToDispose = Array.from(this.assets.values());
    
    assetsToDispose.forEach(asset => {
      this.performDisposal(asset);
      this.stats.disposedAssets++;
      this.stats.memoryFreedMB += asset.memorySize / (1024 * 1024);
    });

    this.assets.clear();
    this.totalMemoryUsed = 0;
    this.updateStats();
  }

  // Force cleanup of assets under memory pressure
  forceCleanup(): void {
    if (import.meta.env.DEV) {
      console.log('🔥 AssetDisposal: Force cleanup triggered');
    }
    const currentTime = Date.now();
    const assetsToDispose: DisposableAsset[] = [];

    // More aggressive cleanup - include medium priority assets that haven't been used recently
    for (const asset of this.assets.values()) {
      if (!asset.canDispose) continue;

      const timeSinceUsed = currentTime - asset.lastUsed;
      const isOld = timeSinceUsed > (this.options.maxUnusedTime * 0.5); // 50% of normal time
      const isLowPriority = asset.priority === 'low';
      const isMediumPriority = asset.priority === 'medium' && timeSinceUsed > 10000; // 10 seconds for medium

      if (isOld || isLowPriority || isMediumPriority) {
        assetsToDispose.push(asset);
      }
    }

    // Sort by priority and dispose aggressively
    assetsToDispose.sort((a, b) => {
      const priorityOrder = { low: 0, medium: 1, high: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let disposed = 0;
    for (const asset of assetsToDispose) {
      if (this.disposeAsset(asset.id)) {
        disposed++;
      }
    }

    if (import.meta.env.DEV) {
      console.log(`🗑️ AssetDisposal: Force cleanup disposed ${disposed} assets`);
    }
  }

  // Check and dispose unused assets
  cleanup(): void {
    const currentTime = Date.now();
    const memoryLimitBytes = this.options.maxMemoryMB * 1024 * 1024;
    const assetsToDispose: DisposableAsset[] = [];

    // Find assets that can be disposed
    for (const asset of this.assets.values()) {
      if (!asset.canDispose) continue;

      const timeSinceUsed = currentTime - asset.lastUsed;
      const isUnused = timeSinceUsed > this.options.maxUnusedTime;
      const isOverMemoryLimit = this.totalMemoryUsed > memoryLimitBytes;

      if (isUnused || isOverMemoryLimit) {
        assetsToDispose.push(asset);
      }
    }

    // Sort by priority and last used time (dispose low priority and old assets first)
    assetsToDispose.sort((a, b) => {
      const priorityOrder = { low: 0, medium: 1, high: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.lastUsed - b.lastUsed;
    });

    // Dispose assets until we're under memory limit
    let disposed = 0;
    for (const asset of assetsToDispose) {
      if (this.totalMemoryUsed < memoryLimitBytes && disposed > 0) {
        break; // Stop if we're under limit and have disposed at least one
      }

      if (this.disposeAsset(asset.id)) {
        disposed++;
      }
    }

    this.stats.lastCleanup = currentTime;

    if (disposed > 0 && import.meta.env.DEV) {
      console.log(`AssetDisposal: Disposed ${disposed} assets, freed ${(disposed * 0.001).toFixed(1)}MB`);
    }
  }

  // Perform the actual disposal
  private performDisposal(asset: DisposableAsset): boolean {
    try {
      switch (asset.type) {
        case 'geometry':
          if (asset.asset instanceof BufferGeometry) {
            asset.asset.dispose();
          }
          break;
        
        case 'material':
          if (asset.asset instanceof Material) {
            asset.asset.dispose();
          }
          break;
        
        case 'texture':
          if (asset.asset instanceof Texture) {
            asset.asset.dispose();
          }
          break;
        
        case 'mesh':
          if (asset.asset instanceof Mesh) {
            // Dispose geometry and material
            if (asset.asset.geometry) {
              asset.asset.geometry.dispose();
            }
            if (asset.asset.material) {
              if (Array.isArray(asset.asset.material)) {
                asset.asset.material.forEach(mat => mat.dispose());
              } else {
                asset.asset.material.dispose();
              }
            }
            // Remove from parent
            if (asset.asset.parent) {
              asset.asset.parent.remove(asset.asset);
            }
          }
          break;
        
        case 'group':
          if (asset.asset instanceof Group) {
            // Recursively dispose children
            asset.asset.traverse((child) => {
              if (child instanceof Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                  } else {
                    child.material.dispose();
                  }
                }
              }
            });
            // Remove from parent
            if (asset.asset.parent) {
              asset.asset.parent.remove(asset.asset);
            }
          }
          break;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to dispose asset ${asset.id}:`, error);
      return false;
    }
  }

  // Calculate memory size of asset
  private calculateMemorySize(
    asset: Object3D | BufferGeometry | Material | Texture,
    type: string
  ): number {
    let size = 0;

    switch (type) {
      case 'geometry':
        if (asset instanceof BufferGeometry) {
          Object.values(asset.attributes).forEach(attribute => {
            size += attribute.array.byteLength;
          });
          if (asset.index) {
            size += asset.index.array.byteLength;
          }
        }
        break;
      
      case 'material':
        // Materials are relatively small
        size = 1024; // 1KB estimate
        break;
      
      case 'texture':
        if (asset instanceof Texture && asset.image) {
          if (asset.image.width && asset.image.height) {
            // Estimate: width * height * 4 bytes (RGBA)
            size = asset.image.width * asset.image.height * 4;
          }
        }
        break;
      
      case 'mesh':
        if (asset instanceof Mesh) {
          size += this.calculateMemorySize(asset.geometry, 'geometry');
          if (asset.material) {
            if (Array.isArray(asset.material)) {
              asset.material.forEach(mat => {
                size += this.calculateMemorySize(mat, 'material');
              });
            } else {
              size += this.calculateMemorySize(asset.material, 'material');
            }
          }
        }
        break;
      
      case 'group':
        if (asset instanceof Group) {
          asset.traverse((child) => {
            if (child instanceof Mesh) {
              size += this.calculateMemorySize(child, 'mesh');
            }
          });
        }
        break;
    }

    return size;
  }

  // Determine asset type
  private getAssetType(asset: Object3D | BufferGeometry | Material | Texture): DisposableAsset['type'] {
    if (asset instanceof BufferGeometry) return 'geometry';
    if (asset instanceof Material) return 'material';
    if (asset instanceof Texture) return 'texture';
    if (asset instanceof Mesh) return 'mesh';
    if (asset instanceof Group) return 'group';
    return 'mesh'; // Default fallback
  }

  // Update statistics
  private updateStats(): void {
    this.stats.totalAssets = this.assets.size;
    this.stats.totalMemoryMB = this.totalMemoryUsed / (1024 * 1024);
  }

  // Start automatic disposal
  private startAutoDisposal(): void {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      this.cleanup();
    }, this.options.checkInterval);
  }

  // Stop automatic disposal
  stopAutoDisposal(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Get current statistics
  getStats() {
    return {
      ...this.stats,
      memoryLimitMB: this.options.maxMemoryMB,
      memoryUsagePercent: (this.stats.totalMemoryMB / this.options.maxMemoryMB) * 100
    };
  }

  // Update options
  updateOptions(options: Partial<AssetDisposalOptions>): void {
    this.options = { ...this.options, ...options };
    
    if (this.options.enableAutoDisposal && !this.intervalId) {
      this.startAutoDisposal();
    } else if (!this.options.enableAutoDisposal && this.intervalId) {
      this.stopAutoDisposal();
    }
  }

  // Set asset disposal permissions
  setAssetDisposable(id: string, canDispose: boolean): void {
    const asset = this.assets.get(id);
    if (asset) {
      asset.canDispose = canDispose;
    }
  }

  // Get all assets (for debugging)
  getAllAssets(): Map<string, DisposableAsset> {
    return this.assets;
  }

  // Cleanup on destruction
  destroy(): void {
    this.stopAutoDisposal();
    this.disposeAll();
  }
}

// Create singleton instance
export const assetDisposalManager = new AssetDisposalManager({
  maxMemoryMB: 100,
  maxUnusedTime: 30000,
  checkInterval: 5000,
  enableAutoDisposal: true,
  preserveActiveAssets: true
});

// Make available globally for easy access
if (typeof window !== 'undefined') {
  (window as Window & { assetDisposalManager?: AssetDisposalManager }).assetDisposalManager = assetDisposalManager;
}