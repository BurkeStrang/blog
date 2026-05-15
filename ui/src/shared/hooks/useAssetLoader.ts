import { useEffect, useState, useRef, useMemo } from "react";
import type { ResourceCache } from "./assetLoaderTypes";

interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that loads heavy 3D assets (three.js, GLTF models, font, textures).
 *
 * Pass `enabled = false` (e.g. on /posts/:slug) to skip loading entirely —
 * the heavy `assetLoaderImpl` module is dynamic-imported only when enabled,
 * so three.js + loaders never enter the bundle dependency graph of the
 * initial chunk on routes that don't need the 3D canvas.
 */
export function useResourcePreloader(enabled = true) {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: enabled,
    error: null,
  });

  const resourcesRef = useRef<ResourceCache>({
    textures: {},
    models: {},
    fonts: {},
  });

  const compressionSettings = useMemo(() => {
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const isLowEnd = deviceMemory < 4 || hardwareConcurrency < 4;
    return {
      waterNormalsSize: isLowEnd ? 128 : 256,
      waterNormalsQuality: isLowEnd ? 0.6 : 0.7,
      format: "avif" as const,
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoadingState({ isLoading: false, error: null });
      return;
    }
    let cancelled = false;
    let handle: { dispose: () => void } | null = null;
    setLoadingState({ isLoading: true, error: null });

    // Dynamic import so three.js, GLTFLoader, etc. land in their own chunk,
    // not in the entry bundle. Only fetched when enabled.
    void import("./assetLoaderImpl")
      .then(({ loadAssets }) =>
        loadAssets(resourcesRef, compressionSettings, () => cancelled),
      )
      .then((h) => {
        handle = h;
        if (!cancelled) setLoadingState({ isLoading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadingState({
            isLoading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      });

    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, [enabled, compressionSettings]);

  return {
    ...loadingState,
    resources: resourcesRef.current,
  };
}
