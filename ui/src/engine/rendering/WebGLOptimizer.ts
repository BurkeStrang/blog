/**
 * Renderer Optimization Utilities
 * Optimizes Three.js WebGL renderer for memory efficiency and performance
 */

import { WebGLRenderer, Scene, Object3D, Mesh, Material, MeshStandardMaterial, MeshBasicMaterial, BufferGeometry } from 'three';

export interface RendererOptimizationConfig {
  // Memory limits
  maxTextures?: number;
  maxTextureSize?: number;
  maxVertexTextures?: number;
  
  // Performance settings
  antialias?: boolean;
  powerPreference?: 'default' | 'high-performance' | 'low-power';
  pixelRatio?: number;
  
  // Rendering options
  sortObjects?: boolean;
  enableStencil?: boolean;
  preserveDrawingBuffer?: boolean;
  
  // Development options
  enableDebugMode?: boolean;
  forceGC?: boolean;
}

interface ExtendedRenderer extends WebGLRenderer {
  __contextCleanup?: () => void;
  __gcInterval?: ReturnType<typeof setInterval>;
}

export class RendererOptimizer {
  private renderer?: WebGLRenderer;
  private config: Required<RendererOptimizationConfig>;
  private frameCount = 0;
  private lastGC = 0;
  private performanceMonitoring = false;
  
  constructor(config: RendererOptimizationConfig = {}) {
    // Detect device capabilities for defaults
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4;
    
    this.config = {
      maxTextures: config.maxTextures ?? (isLowEnd ? 8 : 16),
      maxTextureSize: config.maxTextureSize ?? (isLowEnd ? 2048 : 4096),
      maxVertexTextures: config.maxVertexTextures ?? 4,
      antialias: config.antialias ?? !isLowEnd,
      powerPreference: config.powerPreference ?? (isLowEnd ? 'low-power' : 'high-performance'),
      pixelRatio: config.pixelRatio ?? Math.min(window.devicePixelRatio, isLowEnd ? 1.5 : 2),
      sortObjects: config.sortObjects ?? true,
      enableStencil: config.enableStencil ?? false,
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
      enableDebugMode: config.enableDebugMode ?? (process.env.NODE_ENV === 'development'),
      forceGC: config.forceGC ?? (process.env.NODE_ENV === 'development'),
    };
  }

  optimizeRenderer(renderer: WebGLRenderer): void {
    this.renderer = renderer;
    
    // Basic renderer settings
    renderer.setPixelRatio(this.config.pixelRatio);
    renderer.sortObjects = this.config.sortObjects;
    
    // Memory optimization
    const capabilities = renderer.capabilities;
    capabilities.maxTextures = Math.min(capabilities.maxTextures, this.config.maxTextures);
    capabilities.maxVertexTextures = Math.min(capabilities.maxVertexTextures, this.config.maxVertexTextures);
    capabilities.maxTextureSize = Math.min(capabilities.maxTextureSize, this.config.maxTextureSize);
    
    // Clearing optimization
    renderer.autoClear = true;
    renderer.autoClearColor = true;
    renderer.autoClearDepth = true;
    renderer.autoClearStencil = this.config.enableStencil;
    
    // Context loss handling
    this.setupContextLossHandling(renderer);
    
    // Performance monitoring in development
    if (this.config.enableDebugMode) {
      this.enablePerformanceMonitoring();
    }
    
    // Force garbage collection setup
    const globalWindow = window as Window & { gc?: () => void };
    if (this.config.forceGC && typeof globalWindow.gc === 'function') {
      this.setupGarbageCollection();
    }
    
    console.log('🚀 Renderer optimized with config:', {
      maxTextures: this.config.maxTextures,
      maxTextureSize: this.config.maxTextureSize,
      pixelRatio: this.config.pixelRatio,
      powerPreference: this.config.powerPreference,
    });
  }

  private setupContextLossHandling(renderer: WebGLRenderer): void {
    const canvas = renderer.domElement;
    
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('🔴 WebGL context lost');
      
      // Pause rendering to prevent errors
      this.performanceMonitoring = false;
    };
    
    const handleContextRestored = () => {
      console.log('🟢 WebGL context restored');
      
      // Re-optimize renderer after context restoration
      setTimeout(() => {
        this.optimizeRenderer(renderer);
      }, 100);
    };
    
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
    
    // Store cleanup function
    const extendedRenderer = renderer as ExtendedRenderer;
    extendedRenderer.__contextCleanup = () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }

  private enablePerformanceMonitoring(): void {
    this.performanceMonitoring = true;
    
    const logPerformance = () => {
      if (!this.performanceMonitoring || !this.renderer) return;
      
      const info = this.renderer.info;
      
      // Log every 300 frames (~5 seconds at 60fps)
      if (this.frameCount % 300 === 0) {
        console.log('📊 Renderer Performance:', {
          'Render Calls': info.render.calls,
          'Triangles': info.render.triangles,
          'GPU Geometries': info.memory.geometries,
          'GPU Textures': info.memory.textures,
          'Frame': this.frameCount,
        });
      }
      
      this.frameCount++;
      requestAnimationFrame(logPerformance);
    };
    
    requestAnimationFrame(logPerformance);
  }

  private setupGarbageCollection(): void {
    const gcInterval = setInterval(() => {
      const now = Date.now();
      
      // Only GC if enough time has passed and we have a renderer
      if (now - this.lastGC > 60000 && this.renderer) {
        try {
          const globalWindow = window as Window & { gc?: () => void };
          if (typeof globalWindow.gc === 'function') {
            globalWindow.gc();
            this.lastGC = now;
            console.log('🗑️ Forced garbage collection');
          }
        } catch (error) {
          console.warn('Failed to force GC:', error);
        }
      }
    }, 60000); // Every minute
    
    // Store for cleanup
    if (this.renderer) {
      const extendedRenderer = this.renderer as ExtendedRenderer;
      extendedRenderer.__gcInterval = gcInterval;
    }
  }

  // Optimize rendering for specific scenes
  optimizeScene(scene: Scene): void {
    // Traverse scene and optimize objects
    scene.traverse((object: Object3D) => {
      // Optimize materials
      const mesh = object as Mesh;
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((material: Material) => {
          const standardMat = material as MeshStandardMaterial;
          if (standardMat.map) {
            // Disable mipmaps for small textures to save memory
            const texture = standardMat.map;
            if (texture.image && texture.image.width < 512) {
              texture.generateMipmaps = false;
              texture.minFilter = 1006; // LinearFilter
            }
          }
          
          // Optimize material properties for memory
          if (material.transparent === false) {
            material.alphaTest = 0; // Disable alpha testing for opaque materials
          }
        });
      }
      
      // Optimize geometry
      if (mesh.geometry) {
        const geometry = mesh.geometry as BufferGeometry;
        
        // Remove unused vertex attributes to save memory
        if (geometry.attributes.uv2 && !this.usesSecondaryUV(object)) {
          geometry.deleteAttribute('uv2');
        }
        
        if (geometry.attributes.color && !this.usesVertexColors(object)) {
          geometry.deleteAttribute('color');
        }
      }
    });
  }

  private usesSecondaryUV(object: Object3D): boolean {
    const mesh = object as Mesh;
    if (!mesh.material) return false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return materials.some((mat: Material) => {
      const standardMat = mat as MeshStandardMaterial;
      return standardMat.lightMap || standardMat.aoMap;
    });
  }

  private usesVertexColors(object: Object3D): boolean {
    const mesh = object as Mesh;
    if (!mesh.material) return false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    return materials.some((mat: Material) => {
      const basicMat = mat as MeshBasicMaterial;
      return basicMat.vertexColors;
    });
  }

  // Force cleanup and memory release
  forceCleanup(): void {
    if (!this.renderer) return;
    
    // Clear renderer caches
    const gl = this.renderer.getContext();
    
    // Flush GPU commands
    gl.flush();
    gl.finish();
    
    // Force garbage collection if available
    const globalWindow = window as Window & { gc?: () => void };
    if (this.config.forceGC && typeof globalWindow.gc === 'function') {
      try {
        globalWindow.gc();
        console.log('🧹 Forced cleanup and GC completed');
      } catch (error) {
        console.warn('GC failed:', error);
      }
    }
  }

  dispose(): void {
    this.performanceMonitoring = false;
    
    if (this.renderer) {
      // Cleanup context loss handlers
      const extendedRenderer = this.renderer as ExtendedRenderer;
      if (extendedRenderer.__contextCleanup) {
        extendedRenderer.__contextCleanup();
      }
      
      // Clear GC interval
      if (extendedRenderer.__gcInterval) {
        clearInterval(extendedRenderer.__gcInterval);
      }
      
      this.renderer = undefined;
    }
  }

  getConfig(): Required<RendererOptimizationConfig> {
    return { ...this.config };
  }
}

// Singleton instance for global use
export const rendererOptimizer = new RendererOptimizer();

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    rendererOptimizer.dispose();
  });
}