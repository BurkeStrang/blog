import { Texture, TextureLoader, WebGLRenderer } from 'three';

interface TextureConfig {
  maxSize?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  generateMipmaps?: boolean;
  flipY?: boolean;
}

export class TextureOptimizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private loader: TextureLoader;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.loader = new TextureLoader();
  }

  async optimizeTexture(url: string, config: TextureConfig = {}): Promise<Texture> {
    const {
      maxSize = 1024,
      quality = 0.8,
      format = 'webp',
      generateMipmaps = true,
      flipY = false
    } = config;

    try {
      // Load original image
      const img = await this.loadImage(url);
      
      // Calculate optimal size
      const { width, height } = this.calculateOptimalSize(img, maxSize);
      
      // Resize and compress with flip option
      const compressedBlob = await this.compressImage(img, width, height, format, quality, flipY);
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
      return this.loader.loadAsync(url);
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
    this.canvas.width = width;
    this.canvas.height = height;
    
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
      case 'jpg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'image/webp';
    }
  }

  dispose() {
    this.canvas.remove();
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
    if (info) {
      console.log('GPU Memory Usage:', info);
    }
  }
}

export const textureOptimizer = new TextureOptimizer();
export const memoryMonitor = new GPUMemoryMonitor();