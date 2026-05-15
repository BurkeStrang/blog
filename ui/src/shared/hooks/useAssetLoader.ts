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
 *
 * Once assets are loaded they STAY loaded until the hook unmounts — toggling
 * `enabled` back to false (navigating to a non-canvas route) doesn't dispose
 * them, so returning to a canvas route is instant. Disposal only fires on
 * unmount (e.g. full page reload).
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
  const hasLoadedRef = useRef(false);
  const handleRef = useRef<{ dispose: () => void } | null>(null);

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

  // Trigger asset loading when the hook becomes enabled. Once loaded, this
  // effect early-returns on every subsequent `enabled` toggle — resources
  // are kept alive so re-entering a canvas route is instant.
  useEffect(() => {
    if (!enabled || hasLoadedRef.current) {
      // If we're already loaded but state is still showing loading (rare),
      // sync it so consumers can render.
      if (hasLoadedRef.current) {
        setLoadingState((s) => (s.isLoading ? { isLoading: false, error: null } : s));
      }
      return;
    }

    let cancelled = false;
    setLoadingState({ isLoading: true, error: null });

    void import("./assetLoaderImpl")
      .then(({ loadAssets }) =>
        loadAssets(resourcesRef, compressionSettings, () => cancelled),
      )
      .then((h) => {
        handleRef.current = h;
        hasLoadedRef.current = true;
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

    // Cleanup ONLY cancels the in-flight load. Does NOT dispose loaded assets;
    // disposal is handled by the separate unmount-only effect below.
    return () => {
      cancelled = true;
    };
  }, [enabled, compressionSettings]);

  // Dispose loaded resources on hook unmount only (e.g. full page reload).
  // Empty deps so this cleanup never fires from `enabled` toggling.
  useEffect(() => {
    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
      hasLoadedRef.current = false;
    };
  }, []);

  return {
    ...loadingState,
    resources: resourcesRef.current,
  };
}
