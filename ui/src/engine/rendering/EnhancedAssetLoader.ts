import { TextureLoader, Texture, LoadingManager, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { textureOptimizer, TextureConfig } from './TextureCompressor';

interface LoadOptions {
  enableDraco?: boolean;
  enableKTX2?: boolean;
  textureConfig?: TextureConfig;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Enhanced asset loader with compression support and memory optimization
 */
export class EnhancedAssetLoader {
  private gltfLoader: GLTFLoader;
  private textureLoader: TextureLoader;
  private ktx2Loader?: KTX2Loader;
  private dracoLoader?: DRACOLoader;
  private loadingManager: LoadingManager;
  private loadQueue: Array<{ 
    url: string; 
    options: LoadOptions; 
    resolve: (value: import('three/examples/jsm/loaders/GLTFLoader').GLTF) => void; 
    reject: (reason?: unknown) => void; 
  }> = [];
  private isProcessing = false;
  private maxConcurrentLoads = 3;
  private currentLoads = 0;

  constructor() {
    this.loadingManager = new LoadingManager();
    this.textureLoader = new TextureLoader(this.loadingManager);
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    
    this.setupLoadingCallbacks();
  }

  private setupLoadingCallbacks() {
    this.loadingManager.onLoad = () => {
      console.log('✅ All assets loaded successfully');
    };

    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = Math.round((itemsLoaded / itemsTotal) * 100);
      console.log(`📦 Loading progress: ${progress}% (${url})`);
    };

    this.loadingManager.onError = (url) => {
      console.error(`❌ Failed to load asset: ${url}`);
    };
  }

  /**
   * Initialize DRACO compression support
   */
  enableDraco(dracoPath = '/draco/') {
    if (!this.dracoLoader) {
      this.dracoLoader = new DRACOLoader();
      this.dracoLoader.setDecoderPath(dracoPath);
      this.dracoLoader.setDecoderConfig({ type: 'js' });
      this.gltfLoader.setDRACOLoader(this.dracoLoader);
      console.log('🗜️ DRACO compression enabled');
    }
  }

  /**
   * Initialize KTX2/Basis texture support
   */
  enableKTX2(renderer: import('three').WebGLRenderer, basisPath = '/basis/') {
    if (!this.ktx2Loader) {
      this.ktx2Loader = new KTX2Loader();
      this.ktx2Loader.setTranscoderPath(basisPath);
      this.ktx2Loader.detectSupport(renderer);
      console.log('🎨 KTX2/Basis texture support enabled');
    }
  }

  /**
   * Load GLTF model with optimization options
   */
  async loadGLTF(url: string, options: LoadOptions = {}): Promise<import('three/examples/jsm/loaders/GLTFLoader').GLTF> {
    return new Promise((resolve, reject) => {
      this.loadQueue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Load and optimize texture
   */
  async loadTexture(url: string, options: LoadOptions = {}): Promise<Texture> {
    const { textureConfig = {} } = options;
    
    // Check if we should use KTX2 format first
    const ktx2Url = url.replace(/\.(jpg|jpeg|png|webp)$/i, '.ktx2');
    
    try {
      // Try KTX2 first if available and enabled
      if (options.enableKTX2 && this.ktx2Loader) {
        try {
          const response = await fetch(ktx2Url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`🎨 Loading KTX2 texture: ${ktx2Url}`);
            return await this.ktx2Loader.loadAsync(ktx2Url);
          }
        } catch {
          // KTX2 not available, continue with regular optimization
        }
      }

      // Use texture optimizer for regular textures
      return await textureOptimizer.optimizeTexture(url, {
        maxSize: 512,
        quality: 0.75,
        format: 'webp',
        ...textureConfig
      });
    } catch (error) {
      console.warn(`Failed to load optimized texture ${url}, using fallback:`, error);
      return await this.textureLoader.loadAsync(url);
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.currentLoads >= this.maxConcurrentLoads) return;
    
    const item = this.loadQueue.shift();
    if (!item) return;

    this.isProcessing = true;
    this.currentLoads++;

    try {
      const { url, options, resolve } = item;
      
      // Configure loaders based on options
      if (options.enableDraco && !this.dracoLoader) {
        this.enableDraco();
      }

      console.log(`📦 Loading GLTF: ${url}`);
      const gltf = await this.gltfLoader.loadAsync(url);
      
      // Optimize textures in the loaded model
      if (gltf.scene) {
        await this.optimizeSceneTextures(gltf.scene, options);
      }
      
      resolve(gltf);
    } catch (error) {
      item.reject(error);
    } finally {
      this.currentLoads--;
      this.isProcessing = false;
      
      // Process next item in queue
      if (this.loadQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private async optimizeSceneTextures(scene: import('three').Object3D, options: LoadOptions) {
    scene.traverse(async (object: import('three').Object3D) => {
      if (object.type === 'Mesh' && 'material' in object && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        for (const material of materials) {
          if (material instanceof MeshStandardMaterial) {
            // Optimize common texture maps
            const textureProps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap'] as const;
            
            for (const prop of textureProps) {
              const texture = material[prop] as Texture | null;
              if (texture && texture.image && texture.image.src) {
                try {
                  const optimized = await this.loadTexture(texture.image.src, options);
                  material[prop] = optimized;
                  texture.dispose(); // Dispose original texture
                } catch (error) {
                  console.warn(`Failed to optimize ${prop} texture:`, error);
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Dispose all loaders and free memory
   */
  dispose() {
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }
    if (this.ktx2Loader) {
      this.ktx2Loader.dispose();
    }
    textureOptimizer.dispose();
    
    // Clear queue
    this.loadQueue.forEach(item => item.reject(new Error('Loader disposed')));
    this.loadQueue = [];
    
    console.log('🧹 EnhancedAssetLoader disposed');
  }

  /**
   * Get loading statistics
   */
  getStats() {
    return {
      queueLength: this.loadQueue.length,
      currentLoads: this.currentLoads,
      maxConcurrentLoads: this.maxConcurrentLoads,
      dracoEnabled: !!this.dracoLoader,
      ktx2Enabled: !!this.ktx2Loader
    };
  }
}

export const enhancedAssetLoader = new EnhancedAssetLoader();