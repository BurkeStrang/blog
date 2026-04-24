import { Object3D, Vector3, PerspectiveCamera, BufferGeometry, Material } from 'three';

interface LODLevel {
  distance: number;
  object?: Object3D;
  geometry?: BufferGeometry;
  material?: Material;
  visible: boolean;
}

export class LODManager {
  private objects: Map<string, {
    position: Vector3;
    levels: LODLevel[];
    currentLevel: number;
  }> = new Map();
  
  private camera?: PerspectiveCamera;
  private updateThrottle = 100; // ms
  private lastUpdate = 0;

  setCamera(camera: PerspectiveCamera) {
    this.camera = camera;
  }

  addLODObject(
    id: string,
    position: Vector3,
    levels: Omit<LODLevel, 'visible'>[]
  ) {
    this.objects.set(id, {
      position,
      levels: levels.map(level => ({ ...level, visible: false })),
      currentLevel: -1
    });
  }

  update() {
    const now = Date.now();
    if (now - this.lastUpdate < this.updateThrottle || !this.camera) {
      return;
    }
    
    this.lastUpdate = now;
    const cameraPosition = this.camera.position;

    this.objects.forEach((obj) => {
      const distance = cameraPosition.distanceTo(obj.position);
      let newLevel = -1;

      // Find appropriate LOD level
      for (let i = 0; i < obj.levels.length; i++) {
        if (distance <= obj.levels[i].distance) {
          newLevel = i;
          break;
        }
      }

      // Only update if level changed
      if (newLevel !== obj.currentLevel) {
        // Hide current level
        if (obj.currentLevel >= 0) {
          const currentLevelObj = obj.levels[obj.currentLevel];
          if (currentLevelObj.object) {
            currentLevelObj.object.visible = false;
          }
          currentLevelObj.visible = false;
        }

        // Show new level
        if (newLevel >= 0) {
          const newLevelObj = obj.levels[newLevel];
          if (newLevelObj.object) {
            newLevelObj.object.visible = true;
          }
          newLevelObj.visible = true;
        }

        obj.currentLevel = newLevel;
      }
    });
  }

  dispose() {
    this.objects.clear();
  }

  getVisibleLevel(id: string): number {
    return this.objects.get(id)?.currentLevel ?? -1;
  }

  isVisible(id: string, level: number): boolean {
    const obj = this.objects.get(id);
    return obj?.levels[level]?.visible ?? false;
  }
}

// Geometry pooling for memory efficiency
export class GeometryPool {
  private static pools: Map<string, BufferGeometry[]> = new Map();
  private static inUse: Map<BufferGeometry, string> = new Map();

  static getGeometry(key: string, factory: () => BufferGeometry): BufferGeometry {
    let pool = this.pools.get(key);
    if (!pool) {
      pool = [];
      this.pools.set(key, pool);
    }

    // Reuse existing geometry if available
    const geometry = pool.pop();
    if (geometry) {
      this.inUse.set(geometry, key);
      return geometry;
    }

    // Create new geometry
    const newGeometry = factory();
    this.inUse.set(newGeometry, key);
    return newGeometry;
  }

  static releaseGeometry(geometry: BufferGeometry) {
    const key = this.inUse.get(geometry);
    if (key) {
      this.inUse.delete(geometry);
      const pool = this.pools.get(key);
      if (pool && pool.length < 10) { // Limit pool size
        pool.push(geometry);
      } else {
        geometry.dispose();
      }
    }
  }

  static clearAll() {
    this.pools.forEach(pool => {
      pool.forEach(geometry => geometry.dispose());
    });
    this.pools.clear();
    this.inUse.clear();
  }
}

// Memory-efficient instancing
export class InstanceManager {
  private instances: Map<string, {
    count: number;
    positions: Float32Array;
    rotations: Float32Array;
    scales: Float32Array;
    dirty: boolean;
  }> = new Map();

  createInstanceGroup(id: string, maxCount: number) {
    this.instances.set(id, {
      count: 0,
      positions: new Float32Array(maxCount * 3),
      rotations: new Float32Array(maxCount * 4), // quaternions
      scales: new Float32Array(maxCount * 3),
      dirty: false
    });
  }

  addInstance(
    id: string,
    position: Vector3,
    rotation: { x: number; y: number; z: number; w: number },
    scale: Vector3
  ): number {
    const group = this.instances.get(id);
    if (!group) return -1;

    const index = group.count;
    if (index * 3 >= group.positions.length) return -1; // Full

    // Set position
    group.positions[index * 3] = position.x;
    group.positions[index * 3 + 1] = position.y;
    group.positions[index * 3 + 2] = position.z;

    // Set rotation
    group.rotations[index * 4] = rotation.x;
    group.rotations[index * 4 + 1] = rotation.y;
    group.rotations[index * 4 + 2] = rotation.z;
    group.rotations[index * 4 + 3] = rotation.w;

    // Set scale
    group.scales[index * 3] = scale.x;
    group.scales[index * 3 + 1] = scale.y;
    group.scales[index * 3 + 2] = scale.z;

    group.count++;
    group.dirty = true;

    return index;
  }

  getInstanceData(id: string) {
    return this.instances.get(id);
  }

  dispose() {
    this.instances.clear();
  }
}

export const lodManager = new LODManager();
export const geometryPool = new GeometryPool();
export const instanceManager = new InstanceManager();