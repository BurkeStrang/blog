/**
 * Performance Monitoring for Three.js Applications
 * Tracks draw calls, triangles, and rendering performance
 */

import { WebGLRenderer } from 'three';
import { FrustumCullingManager } from '../culling/FrustumCulling';
import { AssetDisposalManager } from '../memory/AssetDisposal';

interface PerformanceStats {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  fps: number;
  frameTime: number;
  culling?: {
    totalObjects: number;
    visibleObjects: number;
    culledObjects: number;
    disposedObjects: number;
    memoryFreedMB: string;
  };
  memory?: {
    totalAssets: number;
    totalMemoryMB: number;
    disposedAssets: number;
    memoryFreedMB: number;
    memoryUsagePercent: number;
  };
}

export class PerformanceMonitor {
  private renderer: WebGLRenderer | null = null;
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsHistory: number[] = [];
  private readonly maxFpsHistory = 60; // Keep last 60 frames
  private isEnabled = process.env.NODE_ENV === 'development';
  private frustumCullingManager: FrustumCullingManager | null = null;
  private assetDisposalManager: AssetDisposalManager | null = null;

  setRenderer(renderer: WebGLRenderer) {
    this.renderer = renderer;
  }

  setFrustumCullingManager(manager: FrustumCullingManager) {
    this.frustumCullingManager = manager;
  }

  setAssetDisposalManager(manager: AssetDisposalManager) {
    this.assetDisposalManager = manager;
  }

  enable(enabled: boolean = true) {
    this.isEnabled = enabled;
  }

  getStats(): PerformanceStats {
    if (!this.renderer || !this.isEnabled) {
      return {
        drawCalls: 0,
        triangles: 0,
        points: 0,
        lines: 0,
        geometries: 0,
        textures: 0,
        fps: 0,
        frameTime: 0,
      };
    }

    const info = this.renderer.info;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    const fps = 1000 / deltaTime;

    // Update FPS history
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    this.lastTime = currentTime;
    this.frameCount++;

    const stats: PerformanceStats = {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      fps: Math.round(avgFps),
      frameTime: Math.round(deltaTime * 100) / 100,
    };

    // Add culling statistics if available
    if (this.frustumCullingManager) {
      stats.culling = this.frustumCullingManager.getStats();
    }

    // Add memory management statistics if available
    if (this.assetDisposalManager) {
      stats.memory = this.assetDisposalManager.getStats();
    }

    return stats;
  }

  logStats(component: string = 'Unknown') {
    if (!this.isEnabled) return;

    const stats = this.getStats();
    
    // Only log every 120 frames to avoid spam
    if (this.frameCount % 120 === 0) {
      const logData: Record<string, unknown> = {
        'Draw Calls': stats.drawCalls,
        'Triangles': stats.triangles.toLocaleString(),
        'Geometries': stats.geometries,
        'Textures': stats.textures,
        'FPS': stats.fps,
        'Frame Time': `${stats.frameTime}ms`
      };

      if (stats.culling) {
        logData['Culling'] = {
          'Visible': stats.culling.visibleObjects,
          'Culled': stats.culling.culledObjects,
          'Disposed': stats.culling.disposedObjects,
          'Memory Freed': `${stats.culling.memoryFreedMB}MB`
        };
      }

      if (stats.memory) {
        logData['Memory'] = {
          'Assets': stats.memory.totalAssets,
          'Memory Usage': `${stats.memory.totalMemoryMB.toFixed(1)}MB`,
          'Usage %': `${stats.memory.memoryUsagePercent.toFixed(1)}%`,
          'Disposed': stats.memory.disposedAssets
        };
      }

      if (import.meta.env.DEV) {
        console.log(`📊 ${component} Performance:`, logData);
      }
    }
  }

  // Check if performance is degraded
  isPerformanceDegraded(): boolean {
    if (!this.isEnabled || this.fpsHistory.length < 30) return false;
    
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    return avgFps < 30; // Consider degraded if below 30 FPS
  }

  // Reset counters (useful when changing scenes)
  reset() {
    this.frameCount = 0;
    this.fpsHistory = [];
    this.lastTime = performance.now();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();