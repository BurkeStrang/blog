import { Texture, TextureLoader, WebGLRenderer } from 'three';

export interface TextureConfig {
  maxSize?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  generateMipmaps?: boolean;
  flipY?: boolean;
  progressive?: boolean; // For progressive JPEG
}

export class TextureOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loader: TextureLoader;
  private cleanupHandler: () => void;
  private lastCanvasSize: { width: number; height: number } = { width: 0, height: 0 };

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.loader = new TextureLoader();
    
    // Listen for memory cleanup events
    this.cleanupHandler = () => {
      this.forceMemoryCleanup();
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('memory-cleanup-force', this.cleanupHandler);
      window.addEventListener('memory-cleanup-emergency', this.cleanupHandler);
    }
  }

  async optimizeTexture(url: string, config: TextureConfig = {}): Promise<Texture> {
    // Check if optimizer has been disposed
    if (!this.canvas || !this.ctx) {
      console.warn('TextureOptimizer has been disposed, loading texture directly');
      return this.loader.loadAsync(url);
    }

    const {
      maxSize = 512, // Reduced from 1024 for better memory usage
      quality = 0.75, // Slightly reduced for better compression
      format = 'webp',
      generateMipmaps = true,
      flipY = false
    } = config;

    try {
      // Load original image
      const img = await this.loadImage(url);
      
      // Get the best supported format for maximum compression
      const bestFormat = await this.getBestFormat(format);
      
      // Calculate optimal size
      const { width, height } = this.calculateOptimalSize(img, maxSize);
      
      // Log compression info
      if (import.meta.env.DEV) {
        const originalSize = (img.width * img.height * 4) / (1024 * 1024); // MB
        const newSize = (width * height * 4) / (1024 * 1024); // MB
        console.log(`🗜️ Compressing ${url}: ${img.width}x${img.height} (${originalSize.toFixed(1)}MB) → ${width}x${height} (${newSize.toFixed(1)}MB, ${bestFormat})`);
      }
      
      // Resize and compress with flip option
      const compressedBlob = await this.compressImage(img, width, height, bestFormat, quality, flipY);
      const compressedUrl = URL.createObjectURL(compressedBlob);
      
      // Create Three.js texture
      const texture = await this.loader.loadAsync(compressedUrl);
      
      // Optimize texture settings
      texture.generateMipmaps = generateMipmaps;
      texture.flipY = false; // Always false since we handle flipping during compression
      
      // Cleanup
      URL.revokeObjectURL(compressedUrl);
      
      return texture;
    } catch (error) {
      console.warn(`Failed to optimize texture ${url}, using original:`, error);
      const fallbackTexture = await this.loader.loadAsync(url);
      // Note: Fallback textures should be disposed by the calling code
      return fallbackTexture;
    }
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  private calculateOptimalSize(img: HTMLImageElement, maxSize: number): { width: number; height: number } {
    const { width, height } = img;
    
    if (width <= maxSize && height <= maxSize) {
      return { width, height };
    }
    
    const aspectRatio = width / height;
    
    if (width > height) {
      return {
        width: maxSize,
        height: Math.round(maxSize / aspectRatio)
      };
    } else {
      return {
        width: Math.round(maxSize * aspectRatio),
        height: maxSize
      };
    }
  }

  private async compressImage(
    img: HTMLImageElement,
    width: number,
    height: number,
    format: string,
    quality: number,
    flipY: boolean = false
  ): Promise<Blob> {
    // Check if canvas has been disposed
    if (!this.canvas || !this.ctx) {
      throw new Error('TextureOptimizer has been disposed');
    }
    
    // Clear canvas before resizing to prevent memory accumulation
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Only resize if necessary to avoid creating new texture buffers
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.lastCanvasSize = { width, height };
    }
    
    // Use high-quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);
    
    if (flipY) {
      // Flip the image vertically
      this.ctx.save();
      this.ctx.scale(1, -1);
      this.ctx.drawImage(img, 0, -height, width, height);
      this.ctx.restore();
    } else {
      // Draw normally
      this.ctx.drawImage(img, 0, 0, width, height);
    }
    
    return new Promise((resolve, reject) => {
      const mimeType = this.getMimeType(format);
      this.canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        mimeType,
        quality
      );
    });
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'webp': return 'image/webp';
      case 'avif': return 'image/avif';
      case 'jpg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'image/webp';
    }
  }

  // Check if browser supports AVIF for even better compression
  private async getBestFormat(preferredFormat: string): Promise<string> {
    if (preferredFormat === 'avif') {
      // Test AVIF support
      return new Promise((resolve) => {
        const avifTest = new Image();
        avifTest.onload = () => resolve('avif');
        avifTest.onerror = () => resolve('webp'); // Fallback to WebP
        avifTest.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
      });
    }
    return preferredFormat;
  }

  private forceMemoryCleanup(): void {
    // Clear canvas data to free memory under pressure
    if (this.ctx && this.canvas) {
      try {
        // Clear current canvas content
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset to minimum possible size to release memory
        this.canvas.width = 1;
        this.canvas.height = 1;
        
        // Clear the 1x1 canvas and reset drawing state
        this.ctx.clearRect(0, 0, 1, 1);
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform matrix
        this.ctx.globalAlpha = 1; // Reset alpha
        this.ctx.globalCompositeOperation = 'source-over'; // Reset blend mode
        
        // Reset last canvas size tracking so next texture will resize properly
        this.lastCanvasSize = { width: 0, height: 0 };
        
        // Force browser to reclaim canvas buffer memory
        if (typeof window !== 'undefined') {
          requestAnimationFrame(() => {
            // Additional cleanup after frame render
            this.ctx?.clearRect(0, 0, 1, 1);
          });
        }
        
      } catch (error) {
        console.warn('Error during TextureOptimizer memory cleanup:', error);
      }
    }
  }

  dispose() {
    // Remove event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('memory-cleanup-force', this.cleanupHandler);
      window.removeEventListener('memory-cleanup-emergency', this.cleanupHandler);
    }
    
    // Clear canvas and release memory safely
    if (this.ctx && this.canvas) {
      try {
        // Clear all canvas data before disposal
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Force canvas memory cleanup by resetting dimensions
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.ctx.clearRect(0, 0, 1, 1);
        
        // Force garbage collection if available (development/debug mode)
        if (typeof window !== 'undefined' && (window as unknown as { gc?: () => void }).gc) {
          (window as unknown as { gc: () => void }).gc();
        }
        
        // Final dimension reset
        this.canvas.width = 0;
        this.canvas.height = 0;
        
        // Remove from DOM if attached
        if (this.canvas.parentNode) {
          this.canvas.parentNode.removeChild(this.canvas);
        }
      } catch (error) {
        console.warn('Error during TextureOptimizer disposal:', error);
      }
    }
    
    // Clear references to help GC
    this.ctx = null as unknown as CanvasRenderingContext2D;
    this.canvas = null as unknown as HTMLCanvasElement;
  }
}

// GPU Memory Monitor
export class GPUMemoryMonitor {
  private renderer?: WebGLRenderer;
  
  setRenderer(renderer: WebGLRenderer) {
    this.renderer = renderer;
  }

  getMemoryInfo() {
    if (!this.renderer) return null;
    
    const gl = this.renderer.getContext();
    const info = this.renderer.info;
    
    return {
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      webglMemory: this.getWebGLMemoryUsage(gl)
    };
  }

  private getWebGLMemoryUsage(gl: WebGLRenderingContext) {
    // Try to get memory info if available (Chrome)
    const memoryInfo = (gl as WebGLRenderingContext & { getExtension?(name: string): unknown }).getExtension?.('WEBGL_debug_renderer_info');
    if (memoryInfo) {
      return {
        vendor: gl.getParameter(memoryInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(memoryInfo.UNMASKED_RENDERER_WEBGL)
      };
    }
    return null;
  }

  logMemoryUsage() {
    const info = this.getMemoryInfo();
    if (info && import.meta.env.DEV) {
      console.log('GPU Memory Usage:', info);
    }
  }
}

export const textureOptimizer = new TextureOptimizer();
export const memoryMonitor = new GPUMemoryMonitor();