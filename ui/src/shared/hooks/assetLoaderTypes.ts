// Type-only definitions for the asset cache. Splitting these out lets the
// thin useAssetLoader hook reference the types via `import type` without
// pulling three.js into the initial chunk.

import type { Texture } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Font } from "three/examples/jsm/loaders/FontLoader.js";

export interface ResourceCache {
  textures: {
    waterNormals?: Texture;
  };
  models: {
    sphere?: GLTF;
    rubiksCube?: GLTF;
  };
  fonts: {
    inter?: Font;
  };
}
