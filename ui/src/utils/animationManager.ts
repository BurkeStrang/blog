/**
 * Animation Manager for proper cleanup of animation loops and requestAnimationFrame
 * Helps prevent memory leaks from dangling animation callbacks
 */

interface AnimationHandle {
  id: number;
  name: string;
  type: 'requestAnimationFrame' | 'setInterval' | 'setTimeout';
  cleanup: () => void;
}

export class AnimationManager {
  private static instance: AnimationManager;
  private handles = new Map<number, AnimationHandle>();
  private nextId = 1;

  static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  /**
   * Register a requestAnimationFrame with automatic cleanup tracking
   */
  requestAnimationFrame(callback: FrameRequestCallback, name: string = 'anonymous'): number {
    const id = this.nextId++;
    const rafId: number = requestAnimationFrame(wrappedCallback);
    
    const wrappedCallback = (time: number) => {
      // Remove from tracking when it executes (RAF only runs once)
      this.handles.delete(id);
      callback(time);
    };
    
    
    this.handles.set(id, {
      id,
      name: `RAF-${name}`,
      type: 'requestAnimationFrame',
      cleanup: () => {
        cancelAnimationFrame(rafId);
        this.handles.delete(id);
      }
    });
    
    return id;
  }

  /**
   * Register a setInterval with automatic cleanup tracking
   */
  setInterval(callback: () => void, delay: number, name: string = 'anonymous'): number {
    const id = this.nextId++;
    const intervalId = setInterval(callback, delay);
    
    this.handles.set(id, {
      id,
      name: `Interval-${name}`,
      type: 'setInterval',
      cleanup: () => {
        clearInterval(intervalId);
        this.handles.delete(id);
      }
    });
    
    return id;
  }

  /**
   * Register a setTimeout with automatic cleanup tracking
   */
  setTimeout(callback: () => void, delay: number, name: string = 'anonymous'): number {
    const id = this.nextId++;
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(wrappedCallback, delay);
    
    const wrappedCallback = () => {
      // Remove from tracking when it executes (timeout only runs once)
      this.handles.delete(id);
      callback();
    };
    
    
    this.handles.set(id, {
      id,
      name: `Timeout-${name}`,
      type: 'setTimeout',
      cleanup: () => {
        clearTimeout(timeoutId);
        this.handles.delete(id);
      }
    });
    
    return id;
  }

  /**
   * Cancel a specific animation by ID
   */
  cancel(id: number): void {
    const handle = this.handles.get(id);
    if (handle) {
      handle.cleanup();
    }
  }

  /**
   * Cancel all animations of a specific type
   */
  cancelType(type: 'requestAnimationFrame' | 'setInterval' | 'setTimeout'): void {
    const toCancel = Array.from(this.handles.values()).filter(h => h.type === type);
    toCancel.forEach(handle => handle.cleanup());
  }

  /**
   * Cancel all animations containing a name pattern
   */
  cancelByName(namePattern: string): void {
    const toCancel = Array.from(this.handles.values()).filter(h => 
      h.name.includes(namePattern)
    );
    toCancel.forEach(handle => handle.cleanup());
  }

  /**
   * Get current active animations (for debugging)
   */
  getActiveAnimations(): AnimationHandle[] {
    return Array.from(this.handles.values());
  }

  /**
   * Cancel all animations and clear tracking
   */
  cancelAll(): void {
    this.handles.forEach(handle => handle.cleanup());
    this.handles.clear();
  }

  /**
   * Log current active animations (for debugging)
   */
  logActiveAnimations(): void {
    if (this.handles.size === 0) {
      console.log('🎬 No active animations');
      return;
    }

    console.group(`🎬 Active Animations (${this.handles.size})`);
    this.handles.forEach(handle => {
      console.log(`${handle.type}: ${handle.name} (ID: ${handle.id})`);
    });
    console.groupEnd();
  }
}

// Create singleton instance
export const animationManager = AnimationManager.getInstance();

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    animationManager.cancelAll();
  });

  // Development helper - log active animations every 60 seconds
  if (process.env.NODE_ENV === 'development') {
    animationManager.setInterval(() => {
      if (animationManager.getActiveAnimations().length > 0) {
        animationManager.logActiveAnimations();
      }
    }, 60000, 'dev-logger');
  }
}

/**
 * Hook for React components to ensure animation cleanup on unmount
 */
export const useAnimationCleanup = () => {
  const animationIds = new Set<number>();

  const registerAnimation = (id: number) => {
    animationIds.add(id);
    return id;
  };

  const cleanup = () => {
    animationIds.forEach(id => animationManager.cancel(id));
    animationIds.clear();
  };

  // Return cleanup function for use in useEffect
  return { registerAnimation, cleanup };
};