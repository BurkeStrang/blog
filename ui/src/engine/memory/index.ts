/**
 * Memory Management Engine
 * Comprehensive memory leak prevention and monitoring for Three.js applications
 */

export { MemoryMonitor as MemoryProfiler, memoryMonitor as memoryProfiler } from './MemoryProfiler';
export { MaterialPool, Vector3Pool, QuaternionPool, Matrix4Pool, ColorPool, MeshPool, clearAllPools, getPoolStats } from './ResourcePool';
export { memoryTracker } from './MemoryTracker';

// Re-export commonly used types
export type { RendererOptimizationConfig } from '../rendering/WebGLOptimizer';