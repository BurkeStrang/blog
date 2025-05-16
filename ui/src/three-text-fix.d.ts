
import {} from "three/examples/jsm/geometries/TextGeometry";

declare module "three/examples/jsm/geometries/TextGeometry" {
  // Extend the interface so `height` is allowed again
  interface TextGeometryParameters {
    height?: number;
  }
}
