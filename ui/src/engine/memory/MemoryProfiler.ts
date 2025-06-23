/**
 * Comprehensive Memory Monitoring System
 * Tracks Three.js GPU memory, JavaScript heap, and provides leak detection
 */

import { WebGLRenderer } from 'three';
import { getPoolStats } from './ResourcePool';

interface MemorySnapshot {
  timestamp: number;
  
  // JavaScript memory (Chrome/Edge only)
  jsHeapSize?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  
  // Three.js GPU memory
  gpuGeometries: number;
  gpuTextures: number;
  
  // Renderer info
  rendererCalls: number;
  rendererTriangles: number;
  rendererPoints: number;
  rendererLines: number;
  
  // Object pools
  poolStats: Record<string, unknown>;
  
  // Component context
  component: string;
  action: string;
}

export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private snapshots: MemorySnapshot[] = [];
  private renderer?: WebGLRenderer;
  private maxSnapshots = 100;
  private isMonitoring = false;
  private monitoringInterval?: ReturnType<typeof setInterval>;
  private reportInterval?: ReturnType<typeof setInterval>;
  
  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  setRenderer(renderer: WebGLRenderer): void {
    this.renderer = renderer;
  }

  private getJSMemoryInfo(): Partial<MemorySnapshot> {
    const info: Partial<MemorySnapshot> = {};
    
    // Browser memory info (Chrome/Edge only)
    if ('memory' in performance) {
      const memory = (performance as unknown as {
        memory: {
          jsHeapSizeLimit: number;
          totalJSHeapSize: number;
          usedJSHeapSize: number;
        };
      }).memory;
      
      info.jsHeapSize = memory.jsHeapSizeLimit;
      info.totalJSHeapSize = memory.totalJSHeapSize;
      info.usedJSHeapSize = memory.usedJSHeapSize;
    }
    
    return info;
  }

  private getGPUMemoryInfo(): Partial<MemorySnapshot> {
    if (!this.renderer) {
      return {
        gpuGeometries: 0,
        gpuTextures: 0,
        rendererCalls: 0,
        rendererTriangles: 0,
        rendererPoints: 0,
        rendererLines: 0,
      };
    }
    
    const info = this.renderer.info;
    
    return {
      gpuGeometries: info.memory.geometries,
      gpuTextures: info.memory.textures,
      rendererCalls: info.render.calls,
      rendererTriangles: info.render.triangles,
      rendererPoints: info.render.points,
      rendererLines: info.render.lines,
    };
  }

  takeSnapshot(component: string, action: string = 'update'): MemorySnapshot {
    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      component,
      action,
      poolStats: getPoolStats(),
      ...this.getJSMemoryInfo(),
      ...this.getGPUMemoryInfo(),
    } as MemorySnapshot;

    this.snapshots.push(snapshot);

    // Limit snapshots to prevent memory growth from monitor itself
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      this.logSnapshot(snapshot);
    }

    return snapshot;
  }

  private logSnapshot(snapshot: MemorySnapshot): void {
    const mb = (bytes?: number) => bytes ? Math.round(bytes / 1024 / 1024 * 100) / 100 : 'N/A';
    
    console.log(`🧠 Memory [${snapshot.component}:${snapshot.action}]:`, {
      'JS Heap Used': `${mb(snapshot.usedJSHeapSize)}MB`,
      'GPU Geometries': snapshot.gpuGeometries,
      'GPU Textures': snapshot.gpuTextures,
      'Render Calls': snapshot.rendererCalls,
      'Triangles': snapshot.rendererTriangles,
      'Time': new Date(snapshot.timestamp).toLocaleTimeString(),
    });
  }

  detectLeaks(): Array<{
    component: string;
    metric: string;
    growth: number;
    severity: 'low' | 'medium' | 'high';
  }> {
    if (this.snapshots.length < 10) return [];

    const recent = this.snapshots.slice(-10);
    const oldest = recent[0];
    const newest = recent[recent.length - 1];
    const timeSpan = newest.timestamp - oldest.timestamp;
    
    if (timeSpan < 30000) return []; // Need at least 30 seconds of data

    const leaks: Array<{
      component: string;
      metric: string;
      growth: number;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    // Check GPU memory growth
    const geometryGrowth = newest.gpuGeometries - oldest.gpuGeometries;
    if (geometryGrowth > 10) {
      leaks.push({
        component: 'GPU',
        metric: 'geometries',
        growth: geometryGrowth,
        severity: geometryGrowth > 50 ? 'high' : geometryGrowth > 25 ? 'medium' : 'low'
      });
    }

    const textureGrowth = newest.gpuTextures - oldest.gpuTextures;
    if (textureGrowth > 5) {
      leaks.push({
        component: 'GPU',
        metric: 'textures',
        growth: textureGrowth,
        severity: textureGrowth > 20 ? 'high' : textureGrowth > 10 ? 'medium' : 'low'
      });
    }

    // Check JS heap growth
    if (oldest.usedJSHeapSize && newest.usedJSHeapSize) {
      const heapGrowth = newest.usedJSHeapSize - oldest.usedJSHeapSize;
      const heapGrowthMB = heapGrowth / 1024 / 1024;
      
      if (heapGrowthMB > 10) {
        leaks.push({
          component: 'JavaScript',
          metric: 'heap',
          growth: Math.round(heapGrowthMB),
          severity: heapGrowthMB > 50 ? 'high' : heapGrowthMB > 25 ? 'medium' : 'low'
        });
      }
    }

    return leaks;
  }

  getMemoryTrend(metric: keyof MemorySnapshot): Array<{ timestamp: number; value: number }> {
    return this.snapshots
      .map(snapshot => ({
        timestamp: snapshot.timestamp,
        value: (snapshot[metric] as number) || 0
      }))
      .filter(point => point.value > 0);
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  startContinuousMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.takeSnapshot('monitor', 'auto');
      
      // Check for leaks every few snapshots
      if (this.snapshots.length % 5 === 0) {
        const leaks = this.detectLeaks();
        if (leaks.length > 0) {
          console.warn('🚨 Memory leaks detected:', leaks);
        }
      }
    }, intervalMs);
    
    console.log(`🔍 Started continuous memory monitoring (${intervalMs}ms intervals)`);
  }

  stopContinuousMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.isMonitoring = false;
      console.log('⏹️ Stopped continuous memory monitoring');
    }
  }

  generateReport(): {
    summary: Record<string, unknown>;
    leaks: Array<{
    component: string;
    metric: string;
    growth: number;
    severity: 'low' | 'medium' | 'high';
  }>;
    trends: Record<string, Array<{ timestamp: number; value: number }>>;
  } {
    if (this.snapshots.length === 0) {
      return { summary: {}, leaks: [], trends: {} };
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    const oldest = this.snapshots[0];
    
    const summary = {
      monitoringDuration: latest.timestamp - oldest.timestamp,
      totalSnapshots: this.snapshots.length,
      currentJSHeap: latest.usedJSHeapSize ? Math.round(latest.usedJSHeapSize / 1024 / 1024) : 'N/A',
      currentGPUGeometries: latest.gpuGeometries,
      currentGPUTextures: latest.gpuTextures,
      averageRenderCalls: Math.round(
        this.snapshots.reduce((sum, s) => sum + s.rendererCalls, 0) / this.snapshots.length
      ),
    };

    const leaks = this.detectLeaks();
    
    const trends = {
      jsHeap: this.getMemoryTrend('usedJSHeapSize'),
      gpuGeometries: this.getMemoryTrend('gpuGeometries'),
      gpuTextures: this.getMemoryTrend('gpuTextures'),
      renderCalls: this.getMemoryTrend('rendererCalls'),
    };

    return { summary, leaks, trends };
  }

  clear(): void {
    this.snapshots = [];
  }

  dispose(): void {
    this.stopContinuousMonitoring();
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }
    
    // Clean up development interval that was stored on the instance
    const extendedInstance = this as MemoryMonitor & { reportInterval?: ReturnType<typeof setInterval> };
    if (extendedInstance.reportInterval) {
      clearInterval(extendedInstance.reportInterval);
      delete extendedInstance.reportInterval;
    }
    
    this.clear();
    this.renderer = undefined;
  }
}

// Singleton instance
export const memoryMonitor = MemoryMonitor.getInstance();

// Auto cleanup and leak detection
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    memoryMonitor.dispose();
  });

  // Development features
  if (process.env.NODE_ENV === 'development') {
    // Start monitoring automatically in development
    setTimeout(() => {
      memoryMonitor.startContinuousMonitoring(30000);
    }, 5000);

    // Generate periodic reports - store interval reference for cleanup
    const reportInterval = setInterval(() => {
      if (memoryMonitor.getSnapshotCount() > 10) {
        const report = memoryMonitor.generateReport();
        if (report.leaks.length > 0) {
          console.group('📊 Memory Report');
          console.log('Summary:', report.summary);
          console.warn('Leaks detected:', report.leaks);
          console.groupEnd();
        }
      }
    }, 120000); // Every 2 minutes
    
    // Store interval reference for cleanup
    (memoryMonitor as MemoryMonitor & { reportInterval?: ReturnType<typeof setInterval> }).reportInterval = reportInterval;

    // Expose to window for debugging
    (window as Window & { memoryMonitor?: MemoryMonitor }).memoryMonitor = memoryMonitor;
  }
}