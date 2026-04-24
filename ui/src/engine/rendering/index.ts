/**
 * Rendering Optimization Engine
 * WebGL and Three.js rendering optimizations for performance and memory efficiency
 */

export { RendererOptimizer as WebGLOptimizer, rendererOptimizer as webglOptimizer } from './WebGLOptimizer';
export { TextureOptimizer as TextureCompressor, textureOptimizer as textureCompressor, GPUMemoryMonitor } from './TextureCompressor';
export { TextureStreaming as AssetStreaming, textureStreaming as assetStreaming } from './AssetStreaming';
export { LODManager, GeometryPool, InstanceManager, lodManager, geometryPool, instanceManager } from './LODSystem';

// Re-export types
export type { RendererOptimizationConfig } from './WebGLOptimizer';
export type { TextureConfig } from './TextureCompressor';