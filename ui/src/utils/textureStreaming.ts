import { Texture } from 'three';

/**
 * Simple texture streaming system to load textures on-demand
 * and unload them when not in use
 */
export class TextureStreaming {
  private textureCache = new Map<string, { texture: Texture; lastUsed: number; refs: number }>();
  private maxCacheSize = 10; // Maximum number of textures to keep in cache
  private gcInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Garbage collect unused textures every 30 seconds
    this.gcInterval = setInterval(() => {
      this.garbageCollect();
    }, 30000);
  }

  /**
   * Get a texture, loading it if not in cache
   */
  async getTexture(url: string, loader: () => Promise<Texture>): Promise<Texture> {
    const cached = this.textureCache.get(url);
    
    if (cached) {
      cached.lastUsed = Date.now();
      cached.refs++;
      return cached.texture;
    }

    // Load texture
    const texture = await loader();
    
    // Add to cache
    this.textureCache.set(url, {
      texture,
      lastUsed: Date.now(),
      refs: 1
    });

    // Check if we need to free memory
    if (this.textureCache.size > this.maxCacheSize) {
      this.garbageCollect();
    }

    return texture;
  }

  /**
   * Release a reference to a texture
   */
  releaseTexture(url: string) {
    const cached = this.textureCache.get(url);
    if (cached) {
      cached.refs--;
    }
  }

  /**
   * Remove unused textures from cache
   */
  private garbageCollect() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    const entries = Array.from(this.textureCache.entries());
    
    // Sort by last used time
    entries.sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    
    // Remove old or unreferenced textures
    for (const [url, cached] of entries) {
      const age = now - cached.lastUsed;
      const shouldRemove = cached.refs <= 0 && (age > maxAge || this.textureCache.size > this.maxCacheSize);
      
      if (shouldRemove) {
        cached.texture.dispose();
        this.textureCache.delete(url);
        console.log(`🗑️ Disposed texture: ${url}`);
      }
    }
  }

  /**
   * Get memory usage statistics
   */
  getStats() {
    return {
      cachedTextures: this.textureCache.size,
      totalRefs: Array.from(this.textureCache.values()).reduce((sum, cached) => sum + cached.refs, 0)
    };
  }

  /**
   * Clear all textures and stop garbage collection
   */
  dispose() {
    this.textureCache.forEach((cached) => {
      cached.texture.dispose();
    });
    this.textureCache.clear();
    clearInterval(this.gcInterval);
  }
}

export const textureStreaming = new TextureStreaming();