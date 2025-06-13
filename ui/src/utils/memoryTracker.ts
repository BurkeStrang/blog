/**
 * Simple memory tracking utility to help monitor memory usage improvements
 */

interface MemorySnapshot {
  timestamp: number;
  jsHeapSize?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
  gpuGeometries?: number;
  gpuTextures?: number;
  component: string;
}

class MemoryTracker {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 50; // Limit to prevent memory growth from tracker itself

  private getMemoryInfo(): Partial<MemorySnapshot> {
    const info: Partial<MemorySnapshot> = {
      timestamp: Date.now(),
    };

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

  takeSnapshot(component: string, gpuInfo?: { geometries: number; textures: number }): void {
    const snapshot: MemorySnapshot = {
      ...this.getMemoryInfo(),
      component,
      gpuGeometries: gpuInfo?.geometries,
      gpuTextures: gpuInfo?.textures,
    } as MemorySnapshot;

    this.snapshots.push(snapshot);

    // Limit snapshots to prevent memory growth
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    if (process.env.NODE_ENV === 'development') {
      this.logSnapshot(snapshot);
    }
  }

  private logSnapshot(snapshot: MemorySnapshot): void {
    const mb = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    console.log(`🧠 Memory [${snapshot.component}]:`, {
      'JS Heap Used': snapshot.usedJSHeapSize ? `${mb(snapshot.usedJSHeapSize)}MB` : 'N/A',
      'GPU Geometries': snapshot.gpuGeometries ?? 'N/A',
      'GPU Textures': snapshot.gpuTextures ?? 'N/A',
      'Time': new Date(snapshot.timestamp).toLocaleTimeString(),
    });
  }

  getMemoryTrend(): { component: string; memoryChange: number }[] {
    if (this.snapshots.length < 2) return [];

    const grouped = new Map<string, MemorySnapshot[]>();
    this.snapshots.forEach(snapshot => {
      const existing = grouped.get(snapshot.component) || [];
      existing.push(snapshot);
      grouped.set(snapshot.component, existing);
    });

    const trends: { component: string; memoryChange: number }[] = [];
    grouped.forEach((snapshots, component) => {
      if (snapshots.length >= 2) {
        const first = snapshots[0];
        const last = snapshots[snapshots.length - 1];
        
        if (first.usedJSHeapSize && last.usedJSHeapSize) {
          const change = last.usedJSHeapSize - first.usedJSHeapSize;
          trends.push({ component, memoryChange: change });
        }
      }
    });

    return trends;
  }

  logSummary(): void {
    if (process.env.NODE_ENV !== 'development') return;
    
    const trends = this.getMemoryTrend();
    if (trends.length === 0) return;

    console.group('📊 Memory Usage Summary');
    trends.forEach(({ component, memoryChange }) => {
      const mb = Math.round(memoryChange / 1024 / 1024 * 100) / 100;
      const emoji = memoryChange > 0 ? '📈' : memoryChange < 0 ? '📉' : '➡️';
      console.log(`${emoji} ${component}: ${mb > 0 ? '+' : ''}${mb}MB`);
    });
    console.groupEnd();
  }

  clear(): void {
    this.snapshots = [];
  }
}

export const memoryTracker = new MemoryTracker();

// Auto-log summary every 30 seconds in development with proper cleanup
let memoryLogInterval: ReturnType<typeof setInterval> | null = null;

if (process.env.NODE_ENV === 'development') {
  memoryLogInterval = setInterval(() => {
    memoryTracker.logSummary();
  }, 30000);
}

// Export cleanup function for when the module is unloaded
export const cleanupMemoryTracker = () => {
  if (memoryLogInterval) {
    clearInterval(memoryLogInterval);
    memoryLogInterval = null;
  }
  memoryTracker.clear();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupMemoryTracker);
}