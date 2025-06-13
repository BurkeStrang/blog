/**
 * Event Manager for proper cleanup of event listeners
 * Helps prevent memory leaks from dangling event listeners
 */

interface EventListenerHandle {
  id: number;
  target: EventTarget | null;
  type: string;
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  component: string;
}

export class EventManager {
  private static instance: EventManager;
  private listeners = new Map<number, EventListenerHandle>();
  private nextId = 1;

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Add an event listener with automatic cleanup tracking
   */
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
    component: string = 'unknown'
  ): number {
    const id = this.nextId++;
    
    // Add the actual event listener
    target.addEventListener(type, listener, options);
    
    // Track it for cleanup
    this.listeners.set(id, {
      id,
      target,
      type,
      listener,
      options,
      component
    });
    
    return id;
  }

  /**
   * Remove a specific event listener by ID
   */
  removeEventListener(id: number): void {
    const handle = this.listeners.get(id);
    if (handle && handle.target) {
      handle.target.removeEventListener(handle.type, handle.listener, handle.options);
      this.listeners.delete(id);
    }
  }

  /**
   * Remove all event listeners for a specific component
   */
  removeListenersByComponent(component: string): void {
    const toRemove = Array.from(this.listeners.values()).filter(h => h.component === component);
    toRemove.forEach(handle => {
      if (handle.target) {
        handle.target.removeEventListener(handle.type, handle.listener, handle.options);
      }
      this.listeners.delete(handle.id);
    });
  }

  /**
   * Remove all event listeners for a specific target
   */
  removeListenersByTarget(target: EventTarget): void {
    const toRemove = Array.from(this.listeners.values()).filter(h => h.target === target);
    toRemove.forEach(handle => {
      if (handle.target) {
        handle.target.removeEventListener(handle.type, handle.listener, handle.options);
      }
      this.listeners.delete(handle.id);
    });
  }

  /**
   * Remove all event listeners of a specific type
   */
  removeListenersByType(type: string): void {
    const toRemove = Array.from(this.listeners.values()).filter(h => h.type === type);
    toRemove.forEach(handle => {
      if (handle.target) {
        handle.target.removeEventListener(handle.type, handle.listener, handle.options);
      }
      this.listeners.delete(handle.id);
    });
  }

  /**
   * Get all active event listeners (for debugging)
   */
  getActiveListeners(): EventListenerHandle[] {
    return Array.from(this.listeners.values());
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.listeners.forEach(handle => {
      if (handle.target) {
        try {
          handle.target.removeEventListener(handle.type, handle.listener, handle.options);
        } catch (error) {
          console.warn('Failed to remove event listener:', error);
        }
      }
    });
    this.listeners.clear();
  }

  /**
   * Log current active event listeners (for debugging)
   */
  logActiveListeners(): void {
    if (this.listeners.size === 0) {
      console.log('🎧 No active event listeners');
      return;
    }

    console.group(`🎧 Active Event Listeners (${this.listeners.size})`);
    
    const byComponent = new Map<string, EventListenerHandle[]>();
    this.listeners.forEach(handle => {
      const existing = byComponent.get(handle.component) || [];
      existing.push(handle);
      byComponent.set(handle.component, existing);
    });

    byComponent.forEach((handles, component) => {
      console.group(`${component} (${handles.length})`);
      handles.forEach(handle => {
        const targetName = handle.target === window ? 'window' :
                          handle.target === document ? 'document' :
                          (handle.target as Element)?.tagName || 'unknown';
        console.log(`${handle.type} on ${targetName} (ID: ${handle.id})`);
      });
      console.groupEnd();
    });
    
    console.groupEnd();
  }

  /**
   * Clean up listeners that reference destroyed DOM elements
   */
  cleanupDestroyedElements(): void {
    const toRemove: number[] = [];
    
    this.listeners.forEach((handle, id) => {
      // Check if target is a DOM element and if it's still in the document
      if (handle.target && 
          handle.target !== window && 
          handle.target !== document &&
          'isConnected' in handle.target) {
        if (!(handle.target as Element).isConnected) {
          toRemove.push(id);
        }
      }
    });
    
    toRemove.forEach(id => {
      this.listeners.delete(id);
    });
    
    if (toRemove.length > 0) {
      console.log(`🧹 Cleaned up ${toRemove.length} listeners for destroyed elements`);
    }
  }
}

// Create singleton instance
export const eventManager = EventManager.getInstance();

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    eventManager.removeAllListeners();
  });

  // Development helpers
  if (process.env.NODE_ENV === 'development') {
    // Log active listeners every 60 seconds
    setInterval(() => {
      const activeCount = eventManager.getActiveListeners().length;
      if (activeCount > 20) { // Only log if we have many listeners
        eventManager.logActiveListeners();
      }
    }, 60000);

    // Clean up destroyed elements every 30 seconds
    setInterval(() => {
      eventManager.cleanupDestroyedElements();
    }, 30000);
  }
}

/**
 * React hook for automatic event listener cleanup
 */
export const useEventManager = (component: string) => {
  const listenerIds = new Set<number>();

  const addEventListener = (
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): number => {
    const id = eventManager.addEventListener(target, type, listener, options, component);
    listenerIds.add(id);
    return id;
  };

  const removeEventListener = (id: number): void => {
    eventManager.removeEventListener(id);
    listenerIds.delete(id);
  };

  const cleanup = (): void => {
    listenerIds.forEach(id => eventManager.removeEventListener(id));
    listenerIds.clear();
  };

  return { addEventListener, removeEventListener, cleanup };
};