/**
 * Ocean Scene Feature
 * 3D ocean visualization with interactive post navigation
 */

// NOTE: do NOT re-export OceanCamera here. Its module has a top-level
// `import * as THREE from "three"` side effect, so any consumer of this
// barrel — even one that only wants LazyOceanCanvas — would pull
// three-vendor into the initial chunk. OceanScene imports OceanCamera
// directly.
export { default as LazyOceanCanvas } from './LazyOceanCanvas';

// Note: OceanScene is dynamically imported by LazyOceanCanvas for better code splitting