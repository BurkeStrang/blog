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
  private maxSnapshots = 20; // Reduce from 100 to 20 to prevent memory growth
  private isMonitoring = false;
  private monitoringInterval?: ReturnType<typeof setInterval>;
  private reportInterval?: ReturnType<typeof setInterval>;
  private lastEmergencyCleanup = 0;
  
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
      // Remove multiple old snapshots at once for better cleanup
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    if (process.env.NODE_ENV === 'development') {
      this.logSnapshot(snapshot);
    }

    return snapshot;
  }

  private logSnapshot(snapshot: MemorySnapshot): void {
    const mb = (bytes?: number) => bytes ? Math.round(bytes / 1024 / 1024 * 100) / 100 : 'N/A';
    const heapMB = mb(snapshot.usedJSHeapSize);
    
    // Emergency action for critical memory usage - prevent infinite loop
    if (typeof heapMB === 'number' && heapMB > 400) {
      console.warn(`⚠️ HIGH MEMORY USAGE: ${heapMB}MB heap, ${snapshot.gpuGeometries} geometries`);
      
      // Only trigger cleanup if enough time has passed since last cleanup
      const timeSinceLastCleanup = Date.now() - this.lastEmergencyCleanup;
      
      // Try cleanup at 500MB (increased from 400MB to prevent loop)
      if (heapMB > 500 && timeSinceLastCleanup > 15000) { // 15 seconds minimum
        this.forceCleanup();
      }
      
      // Emergency cleanup at 700MB (increased from 500MB)
      if (heapMB > 700 && timeSinceLastCleanup > 30000) { // 30 seconds minimum
        console.error(`🚨 CRITICAL MEMORY USAGE: ${heapMB}MB heap`);
        this.emergencyCleanup();
      }
      
      // Log critical memory usage but don't reload automatically
      if (heapMB > 900) {
        console.error('💥 CRITICAL: Memory usage extremely high:', heapMB, 'MB');
        console.error('💡 Consider refreshing the page manually if performance degrades');
        return;
      }
    }
    
    console.log(`🧠 Memory [${snapshot.component}:${snapshot.action}]:`, {
      'JS Heap Used': `${heapMB}MB`,
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
      
      if (heapGrowthMB > 50) {
        leaks.push({
          component: 'JavaScript',
          metric: 'heap',
          growth: Math.round(heapGrowthMB),
          severity: heapGrowthMB > 100 ? 'high' : heapGrowthMB > 75 ? 'medium' : 'low'
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
      
      // Check for leaks less frequently to reduce overhead
      if (this.snapshots.length % 10 === 0) { // Check every 10 snapshots instead of 3
        const leaks = this.detectLeaks();
        if (leaks.length > 0) {
          console.warn('🚨 Memory leaks detected:', leaks);
          
          // Take immediate action on severe heap leaks OR geometry leaks OR texture leaks
          const severeLeaks = leaks.filter(leak => 
            (leak.component === 'JavaScript' && leak.metric === 'heap' && leak.growth > 80) ||
            (leak.component === 'GPU' && leak.metric === 'geometries' && leak.growth > 50) ||
            (leak.component === 'GPU' && leak.metric === 'textures' && leak.growth > 25) // Increased from 10 to 25
          );
          
          if (severeLeaks.length > 0) {
            console.log('🔥 Severe memory leak detected - taking immediate action', severeLeaks);
            
            // Force aggressive cleanup
            if (typeof window !== 'undefined') {
              // Clear any large data structures that might be lingering
              this.forceCleanup();
              
              // Force asset disposal manager cleanup
              const windowWithAssetManager = window as Window & { assetDisposalManager?: { forceCleanup: () => void } };
              if (windowWithAssetManager.assetDisposalManager) {
                console.log('🗑️ Forcing asset disposal manager cleanup');
                windowWithAssetManager.assetDisposalManager.forceCleanup();
              }
              
              // Request garbage collection if available
              if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
                console.log('🗑️ Forcing immediate garbage collection');
                (window as Window & { gc: () => void }).gc();
              }
              
              // Clear our own snapshots to free memory
              if (this.snapshots.length > 20) {
                this.snapshots = this.snapshots.slice(-10);
                console.log('📸 Cleared old memory snapshots');
              }
            }
          }
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

  private forceCleanup(): void {
    try {
      // Force cleanup of any global caches or large objects
      console.log('🧹 Forcing aggressive cleanup...');
      
      // Clear Three.js caches if available
      if (typeof window !== 'undefined') {
        const windowWithTHREE = window as Window & { THREE?: { Cache?: { clear: () => void }, GeometryUtils?: { dispose?: () => void } } };
        if (windowWithTHREE.THREE) {
          const THREE = windowWithTHREE.THREE;
          if (THREE.Cache) THREE.Cache.clear();
          if (THREE.GeometryUtils) THREE.GeometryUtils.dispose?.();
        }
      }
      
      // Trigger event for components to clean up
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('memory-cleanup-force', {
          detail: { severity: 'high', trigger: 'heap-leak' }
        }));
      }
      
      // Clear any large arrays or objects from our monitoring
      if (this.snapshots.length > 5) {
        const recentSnapshots = this.snapshots.slice(-5);
        this.snapshots = recentSnapshots;
      }
      
    } catch (error) {
      console.error('Error during force cleanup:', error);
    }
  }

  private emergencyCleanup(): void {
    try {
      console.error('🆘 EMERGENCY CLEANUP ACTIVATED');
      
      // Prevent emergency cleanup from running too frequently
      const timeSinceLastCleanup = Date.now() - this.lastEmergencyCleanup;
      
      if (timeSinceLastCleanup < 30000) { // 30 seconds
        console.log('🚫 Emergency cleanup skipped - too soon since last cleanup');
        return;
      }
      
      this.lastEmergencyCleanup = Date.now();
      
      // Clear all snapshots except the most recent
      this.snapshots = this.snapshots.slice(-2);
      
      // Force multiple garbage collections
      if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
        console.log('🗑️ Multiple emergency garbage collections...');
        for (let i = 0; i < 3; i++) {
          setTimeout(() => (window as Window & { gc: () => void }).gc(), i * 100);
        }
      }
      
      // Clear Three.js renderer info but don't dispose renderer
      if (this.renderer) {
        console.log('🎮 Clearing renderer info...');
        this.renderer.info.reset();
        // Don't dispose renderer - this kills the canvas and causes app failure
        // this.renderer.dispose();
      }
      
      // Don't trigger emergency cleanup event to avoid app instability
      // window.dispatchEvent(new CustomEvent('memory-cleanup-emergency', {
      //   detail: { 
      //     severity: 'critical', 
      //     trigger: 'emergency-threshold',
      //     action: 'immediate-disposal'
      //   }
      // }));
      
    } catch (error) {
      console.error('Error during emergency cleanup:', error);
    }
  }

  dispose(): void {
    this.stopContinuousMonitoring();
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
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

  // Development features - much less aggressive monitoring
  if (process.env.NODE_ENV === 'development') {
    // Start monitoring with longer intervals to reduce overhead
    setTimeout(() => {
      memoryMonitor.startContinuousMonitoring(60000); // Check every 60s instead of 15s
    }, 5000);

    // Generate periodic reports less frequently
    const reportInterval = setInterval(() => {
      if (memoryMonitor.getSnapshotCount() > 10) { // Wait for more data
        const report = memoryMonitor.generateReport();
        if (report.leaks.length > 0) {
          // Force aggressive cleanup on high memory growth
          const highGrowthLeaks = report.leaks.filter(leak => 
            (leak.metric === 'geometries' && leak.growth > 50) ||
            (leak.metric === 'heap' && leak.growth > 100)
          );
          
          if (highGrowthLeaks.length > 0) {
            console.group('🚨 Critical Memory Leaks - Forcing Cleanup');
            console.warn('High growth detected:', highGrowthLeaks);
            console.log('Summary:', report.summary);
            
            // Force garbage collection if available (Chrome DevTools)
            if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
              console.log('🗑️ Forcing garbage collection...');
              (window as Window & { gc: () => void }).gc();
            }
            
            console.groupEnd();
          }
        }
      }
    }, 180000); // Check every 3 minutes instead of 1 minute
    
    // Store interval reference on window for cleanup
    (window as Window & { memoryReportInterval?: ReturnType<typeof setInterval> }).memoryReportInterval = reportInterval;

    // Expose to window for debugging
    (window as Window & { memoryMonitor?: MemoryMonitor }).memoryMonitor = memoryMonitor;
  }
}