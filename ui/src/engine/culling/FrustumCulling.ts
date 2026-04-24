import * as THREE from 'three';

export interface CullableObject {
  object3D: THREE.Object3D;
  id: string;
  lastVisible: number;
  isVisible: boolean;
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material | THREE.Material[];
  textures?: THREE.Texture[];
}

export interface FrustumCullingOptions {
  hideDelay: number; // Time in ms before hiding invisible objects
  disposeDelay: number; // Time in ms before disposing invisible objects
  maxInvisibleObjects: number; // Max number of invisible objects to keep
  enableGeometryDisposal: boolean;
  enableMaterialDisposal: boolean;
  enableTextureDisposal: boolean;
}

export class FrustumCullingManager {
  private camera: THREE.Camera;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private objects: Map<string, CullableObject> = new Map();
  private disposedObjects: Map<string, CullableObject> = new Map();
  private options: FrustumCullingOptions;
  private stats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    disposedObjects: 0,
    memoryFreed: 0
  };

  constructor(camera: THREE.Camera, options: Partial<FrustumCullingOptions> = {}) {
    this.camera = camera;
    this.options = {
      hideDelay: 2000, // 2 seconds
      disposeDelay: 30000, // 30 seconds
      maxInvisibleObjects: 100,
      enableGeometryDisposal: true,
      enableMaterialDisposal: true,
      enableTextureDisposal: true,
      ...options
    };
  }

  // Add object to frustum culling system
  addObject(object: THREE.Object3D, id: string): void {
    if (!object.visible) return;

    const cullableObject: CullableObject = {
      object3D: object,
      id,
      lastVisible: Date.now(),
      isVisible: true,
      geometry: this.extractGeometry(object),
      material: this.extractMaterial(object),
      textures: this.extractTextures(object)
    };

    this.objects.set(id, cullableObject);
    this.stats.totalObjects = this.objects.size;
  }

  // Remove object from culling system
  removeObject(id: string): void {
    const object = this.objects.get(id);
    if (object) {
      this.objects.delete(id);
      this.stats.totalObjects = this.objects.size;
    }
  }

  // Update frustum culling
  update(): void {
    // Update camera frustum
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);

    const currentTime = Date.now();
    let visibleCount = 0;
    let culledCount = 0;

    // Check visibility for all objects
    for (const [id, cullableObj] of this.objects) {
      const wasVisible = cullableObj.isVisible;
      const isCurrentlyVisible = this.isObjectVisible(cullableObj.object3D);

      if (isCurrentlyVisible) {
        // Object is visible
        if (!wasVisible) {
          // Object became visible - restore if needed
          this.restoreObject(cullableObj);
        }
        cullableObj.isVisible = true;
        cullableObj.lastVisible = currentTime;
        visibleCount++;
      } else {
        // Object is not visible
        cullableObj.isVisible = false;
        
        const timeSinceVisible = currentTime - cullableObj.lastVisible;
        
        // Hide object after delay
        if (timeSinceVisible > this.options.hideDelay && cullableObj.object3D.visible) {
          this.hideObject(cullableObj);
        }
        
        // Dispose object after longer delay
        if (timeSinceVisible > this.options.disposeDelay) {
          this.disposeObject(cullableObj);
          this.objects.delete(id);
          continue;
        }
        
        culledCount++;
      }
    }

    // Clean up excess invisible objects
    this.cleanupInvisibleObjects();

    // Update stats
    this.stats.visibleObjects = visibleCount;
    this.stats.culledObjects = culledCount;
    this.stats.totalObjects = this.objects.size;
    this.stats.disposedObjects = this.disposedObjects.size;
  }

  // Check if object is visible in frustum
  private isObjectVisible(object: THREE.Object3D): boolean {
    // Update world matrix
    object.updateMatrixWorld();
    
    // Get bounding box
    const box = new THREE.Box3().setFromObject(object);
    
    // Check if bounding box intersects frustum
    return this.frustum.intersectsBox(box);
  }

  // Hide object (keep in memory but make invisible)
  private hideObject(cullableObj: CullableObject): void {
    cullableObj.object3D.visible = false;
    cullableObj.object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = false;
      }
    });
  }

  // Restore object visibility
  private restoreObject(cullableObj: CullableObject): void {
    // Check if object was disposed
    if (this.disposedObjects.has(cullableObj.id)) {
      this.recreateObject(cullableObj);
      this.disposedObjects.delete(cullableObj.id);
    }
    
    cullableObj.object3D.visible = true;
    cullableObj.object3D.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = true;
      }
    });
  }

  // Dispose object and free memory
  private disposeObject(cullableObj: CullableObject): void {
    // Store reference for potential recreation
    this.disposedObjects.set(cullableObj.id, cullableObj);
    
    let memoryFreed = 0;

    // Dispose geometry
    if (this.options.enableGeometryDisposal && cullableObj.geometry) {
      memoryFreed += this.getGeometryMemorySize(cullableObj.geometry);
      cullableObj.geometry.dispose();
    }

    // Dispose materials
    if (this.options.enableMaterialDisposal && cullableObj.material) {
      const materials = Array.isArray(cullableObj.material) ? cullableObj.material : [cullableObj.material];
      materials.forEach(material => {
        memoryFreed += this.getMaterialMemorySize(material);
        material.dispose();
      });
    }

    // Dispose textures
    if (this.options.enableTextureDisposal && cullableObj.textures) {
      cullableObj.textures.forEach(texture => {
        memoryFreed += this.getTextureMemorySize(texture);
        texture.dispose();
      });
    }

    // Remove from scene
    if (cullableObj.object3D.parent) {
      cullableObj.object3D.parent.remove(cullableObj.object3D);
    }

    this.stats.memoryFreed += memoryFreed;
  }

  // Recreate disposed object
  private recreateObject(cullableObj: CullableObject): void {
    // This would need to be implemented based on your specific object creation logic
    // For now, we'll just log that recreation is needed
    console.warn(`Object ${cullableObj.id} needs recreation but no recreation logic implemented`);
  }

  // Clean up excess invisible objects
  private cleanupInvisibleObjects(): void {
    const invisibleObjects = Array.from(this.objects.values())
      .filter(obj => !obj.isVisible)
      .sort((a, b) => a.lastVisible - b.lastVisible);

    if (invisibleObjects.length > this.options.maxInvisibleObjects) {
      const excessCount = invisibleObjects.length - this.options.maxInvisibleObjects;
      const objectsToDispose = invisibleObjects.slice(0, excessCount);
      
      objectsToDispose.forEach(obj => {
        this.disposeObject(obj);
        this.objects.delete(obj.id);
      });
    }
  }

  // Extract geometry from object
  private extractGeometry(object: THREE.Object3D): THREE.BufferGeometry | undefined {
    let geometry: THREE.BufferGeometry | undefined;
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        geometry = child.geometry;
      }
    });
    
    return geometry;
  }

  // Extract material from object
  private extractMaterial(object: THREE.Object3D): THREE.Material | THREE.Material[] | undefined {
    let material: THREE.Material | THREE.Material[] | undefined;
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        material = child.material;
      }
    });
    
    return material;
  }

  // Extract textures from object
  private extractTextures(object: THREE.Object3D): THREE.Texture[] {
    const textures: THREE.Texture[] = [];
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => {
          // Check for common texture properties
          if ('map' in material && material.map) textures.push(material.map);
          if ('normalMap' in material && material.normalMap) textures.push(material.normalMap);
          if ('specularMap' in material && material.specularMap) textures.push(material.specularMap);
          if ('aoMap' in material && material.aoMap) textures.push(material.aoMap);
          if ('roughnessMap' in material && material.roughnessMap) textures.push(material.roughnessMap);
          if ('metalnessMap' in material && material.metalnessMap) textures.push(material.metalnessMap);
        });
      }
    });
    
    return textures;
  }

  // Estimate memory usage (approximate)
  private getGeometryMemorySize(geometry: THREE.BufferGeometry): number {
    let size = 0;
    
    // Calculate size of attributes
    Object.values(geometry.attributes).forEach(attribute => {
      size += attribute.array.byteLength;
    });
    
    // Add index buffer if exists
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }
    
    return size;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getMaterialMemorySize(_material: THREE.Material): number {
    // Rough estimate - materials themselves are small
    return 1024; // 1KB estimate
  }

  private getTextureMemorySize(texture: THREE.Texture): number {
    if (texture.image && texture.image.width && texture.image.height) {
      // Rough estimate: width * height * 4 bytes (RGBA)
      return texture.image.width * texture.image.height * 4;
    }
    return 0;
  }

  // Get culling statistics
  getStats() {
    return {
      ...this.stats,
      memoryFreedMB: (this.stats.memoryFreed / (1024 * 1024)).toFixed(2)
    };
  }

  // Update camera reference
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  // Update options
  updateOptions(options: Partial<FrustumCullingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  // Clear all objects
  clear(): void {
    this.objects.clear();
    this.disposedObjects.clear();
    this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      disposedObjects: 0,
      memoryFreed: 0
    };
  }

  // Get all objects (for debugging)
  getAllObjects(): Map<string, CullableObject> {
    return this.objects;
  }
}