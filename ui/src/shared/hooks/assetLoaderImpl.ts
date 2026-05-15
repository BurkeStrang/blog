// Heavy asset loader implementation — DO NOT import this at module top-level
// from any code in the initial chunk. It pulls in three.js, GLTFLoader,
// DRACOLoader, FontLoader, and TextureCompressor. Always dynamic-import it
// from useAssetLoader, gated on a route check.

import { Mesh, MeshStandardMaterial, LinearFilter } from "three";
import { GLTFLoader, GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextureCompressor } from "../../engine/rendering";
import type { ResourceCache } from "./assetLoaderTypes";

import waterNormalsUrl from "../../assets/textures/waternormals.avif?url";
import sphereUrl from "../../assets/models/sphere/scene.gltf?url";
import blockModelUrl from "../../assets/models/rubikscube/scene.gltf?url";
import fontJsonUrl from "../../assets/fonts/Noto Sans_Regular.json?url";

type FontData = Parameters<FontLoader["parse"]>[0];

interface CompressionSettings {
  waterNormalsSize: number;
  waterNormalsQuality: number;
  format: "avif";
}

export interface LoadAssetsHandle {
  /** Returns a cleanup function that disposes loaded resources. */
  dispose: () => void;
}

export async function loadAssets(
  resourcesRef: { current: ResourceCache },
  compression: CompressionSettings,
  isCancelled: () => boolean,
): Promise<LoadAssetsHandle> {
  const textureOptimizer = new TextureCompressor();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  const fontLoader = new FontLoader();

  function optimizeGLTFTextures(gltf: GLTF) {
    gltf.scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of materials) {
        if (!(mat instanceof MeshStandardMaterial)) continue;
        for (const tex of [mat.map, mat.normalMap, mat.roughnessMap]) {
          if (!tex) continue;
          tex.generateMipmaps = false;
          tex.minFilter = LinearFilter;
          tex.magFilter = LinearFilter;
        }
      }
    });
  }

  try {
    await Promise.all([
      fetch(fontJsonUrl)
        .then((r) => r.json() as Promise<FontData>)
        .then((data) => {
          if (!isCancelled()) resourcesRef.current.fonts.inter = fontLoader.parse(data);
        }),
      textureOptimizer
        .optimizeTexture(waterNormalsUrl, {
          maxSize: compression.waterNormalsSize,
          quality: compression.waterNormalsQuality,
          format: compression.format,
        })
        .then((texture) => {
          if (!isCancelled()) {
            texture.wrapS = texture.wrapT = 1000; // RepeatWrapping
            resourcesRef.current.textures.waterNormals = texture;
          }
        }),
      gltfLoader.loadAsync(sphereUrl).then((gltf) => {
        if (!isCancelled()) {
          optimizeGLTFTextures(gltf);
          resourcesRef.current.models.sphere = gltf;
        }
      }),
      gltfLoader.loadAsync(blockModelUrl).then((gltf) => {
        if (!isCancelled()) {
          optimizeGLTFTextures(gltf);
          resourcesRef.current.models.rubiksCube = gltf;
        }
      }),
    ]);
  } finally {
    textureOptimizer.dispose();
    dracoLoader.dispose();
  }

  return {
    dispose: () => {
      const resources = resourcesRef.current;
      Object.values(resources.textures).forEach((t) => t?.dispose());
      Object.values(resources.models).forEach((gltf) => {
        if (!gltf) return;
        gltf.scene.traverse((child) => {
          const mesh = child as {
            geometry?: { dispose: () => void };
            material?: { dispose: () => void } | { dispose: () => void }[];
          };
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
            else mesh.material.dispose();
          }
        });
      });
      resourcesRef.current = { textures: {}, models: {}, fonts: {} };
    },
  };
}
